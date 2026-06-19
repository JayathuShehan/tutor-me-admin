"use client";

import FormSelect from "@/components/form/Select";
import { Button } from "@/components/ui/button/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useFetchGradeByIdQuery,
  useFetchGradesQuery,
} from "@/store/api/splits/grades";

import {
  useCreateTuitionRateMutation,
  useLazyFetchTuitionRatesQuery,
} from "@/store/api/splits/tuition-rates";

import { getErrorInApiResult } from "@/utils/api";
import { decimalInputRegisterOptions } from "@/utils/form-normalizers";
import { sortBySchoolGradeOrder } from "@/utils/grade-filter-order";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  CreateTuitionSchema,
  createTuitionSchema,
  initialFormValues,
} from "./schema";
import {
  DUPLICATE_TUITION_RATE_MESSAGE,
  getTuitionRateErrorMessage,
  hasDuplicateTuitionRateCombination,
} from "../tuition-rate-validation";

export function AddTuitionRate() {
  const [open, setOpen] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const createTuitionRateForm = useForm<CreateTuitionSchema>({
    resolver: zodResolver(createTuitionSchema),
    defaultValues: initialFormValues,
    mode: "onChange",
  });

  const [createRate, { isLoading }] = useCreateTuitionRateMutation();
  const [fetchTuitionRates] = useLazyFetchTuitionRatesQuery();

  const { data: gradeData, isLoading: isGradesLoading } = useFetchGradesQuery({
    page: 1,
    limit: 50,
  });

  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);

  const { data: gradeDetails, isLoading: isGradeDetailsLoading } =
    useFetchGradeByIdQuery(selectedGradeId!, { skip: !selectedGradeId });

  const onSubmit = async (data: CreateTuitionSchema) => {
    const gradeId = String(data.grade);
    const subjectId = String(data.subject);

    try {
      setIsCheckingDuplicate(true);
      const tuitionRates = await fetchTuitionRates({
        page: 1,
        limit: 1000,
        grade: gradeId,
        subject: subjectId,
      }).unwrap();
      setIsCheckingDuplicate(false);

      if (
        hasDuplicateTuitionRateCombination(
          tuitionRates.results,
          gradeId,
          subjectId,
        )
      ) {
        return toast.error(DUPLICATE_TUITION_RATE_MESSAGE);
      }

      const result = await createRate(data);
      const error = getErrorInApiResult(result);

      if (error) return toast.error(getTuitionRateErrorMessage(error));

      if ("data" in result) {
        createTuitionRateForm.reset();
        toast.success("Tuition Rate created successfully");
        setOpen(false);
      }
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const { formState, watch, setValue } = createTuitionRateForm;
  const selectedGrade = watch("grade");

  useEffect(() => {
    setValue("subject", "");
    setSelectedGradeId(selectedGrade || null);
  }, [selectedGrade, setValue]);

  const gradeOptions = sortBySchoolGradeOrder(gradeData?.results || []).map(
    (grade) => ({
      value: grade.id,
      label: grade.title,
    }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          createTuitionRateForm.reset();
        }
      }}
    >
      <form onSubmit={createTuitionRateForm.handleSubmit(onSubmit)}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="bg-blue-700 text-white hover:bg-blue-500"
          >
            Add Tuition Rate
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[500px] bg-white z-9999 dark:bg-gray-800 dark:text-white/90 p-0 overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0">
          <DialogHeader className="shrink-0 px-6 py-4 border-b bg-white dark:bg-gray-800">
            <DialogTitle>Add Tuition Rate</DialogTitle>
            <DialogDescription>
              Add a new tuition rate to the list.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-6 py-6 grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="grade">
                Grade <span className="text-red-500">*</span>
              </Label>
              <FormSelect
                options={gradeOptions}
                value={watch("grade") || undefined}
                onChange={(value) =>
                  setValue("grade", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                placeholder={
                  isGradesLoading ? "Loading grades..." : "Select grade"
                }
              />

              {formState.errors.grade && (
                <p className="text-sm text-red-500">
                  {formState.errors.grade.message}
                </p>
              )}
            </div>
            <div className="grid gap-3">
              <Label htmlFor="subject">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Select
                onValueChange={(value) =>
                  setValue("subject", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                value={watch("subject")}
                disabled={!selectedGradeId || isGradeDetailsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectGroup>
                    <SelectLabel>Subjects</SelectLabel>
                    {gradeDetails?.subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {formState.errors.subject && (
                <p className="text-sm text-red-500">
                  {formState.errors.subject.message}
                </p>
              )}
            </div>

            {/* RATES */}
            {(
              [
                "universityStudentsRate",
                "partTimeTutorRate",
                "fullTimeTutorRate",
                "moeTeacherRate",
              ] as const
            ).map((key) => (
              <div key={key} className="grid gap-2">
                <Label>
                  {key === "universityStudentsRate"
                    ? "University Students Rate"
                    : key === "partTimeTutorRate"
                      ? "Part-Time Tutor Rate"
                      : key === "fullTimeTutorRate"
                        ? "Full-Time Tutor Rate"
                        : "Ex/Current MOE Teacher Rate"}{" "}
                  <span className="text-red-500">*</span>
                </Label>

                <Input
                  placeholder="Minimum Rate"
                  inputMode="decimal"
                  {...createTuitionRateForm.register(`${key}.minimumRate`, {
                    ...decimalInputRegisterOptions(
                      `${key}.minimumRate`,
                      setValue,
                      formState.isSubmitted,
                      () => {
                        createTuitionRateForm.trigger([
                          `${key}.minimumRate`,
                          `${key}.maximumRate`,
                        ]);
                      },
                    ),
                  })}
                />
                {formState.errors[key]?.minimumRate && (
                  <p className="text-red-500 text-sm">
                    {formState.errors[key]?.minimumRate?.message}
                  </p>
                )}

                <Input
                  placeholder="Maximum Rate"
                  inputMode="decimal"
                  {...createTuitionRateForm.register(`${key}.maximumRate`, {
                    ...decimalInputRegisterOptions(
                      `${key}.maximumRate`,
                      setValue,
                      formState.isSubmitted,
                      () => {
                        createTuitionRateForm.trigger([
                          `${key}.minimumRate`,
                          `${key}.maximumRate`,
                        ]);
                      },
                    ),
                  })}
                />
                {formState.errors[key]?.maximumRate && (
                  <p className="text-red-500 text-sm">
                    {formState.errors[key]?.maximumRate?.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="shrink-0 px-6 py-4 border-t bg-white dark:bg-gray-800">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>

            <Button
              type="submit"
              className="bg-blue-700 text-white hover:bg-blue-500"
              isLoading={isLoading || isCheckingDuplicate}
              onClick={createTuitionRateForm.handleSubmit(onSubmit)}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
