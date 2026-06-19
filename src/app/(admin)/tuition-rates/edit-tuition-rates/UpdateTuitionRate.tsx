"use client";

import Select from "@/components/form/Select";
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
  useFetchGradeByIdQuery,
  useFetchGradesQuery,
} from "@/store/api/splits/grades";
import {
  useLazyFetchTuitionRatesQuery,
  useUpdateTuitionRateMutation,
} from "@/store/api/splits/tuition-rates";
import { getErrorInApiResult } from "@/utils/api";
import { decimalInputRegisterOptions } from "@/utils/form-normalizers";
import { sortBySchoolGradeOrder } from "@/utils/grade-filter-order";

import { zodResolver } from "@hookform/resolvers/zod";
import { SquarePen } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  UpdateTuitionFormValues,
  UpdateTuitionSchema,
  updateTuitionSchema,
} from "./schema";
import {
  DUPLICATE_TUITION_RATE_MESSAGE,
  getTuitionRateErrorMessage,
  hasDuplicateTuitionRateCombination,
} from "../tuition-rate-validation";

interface UpdateTuitionRateProps {
  id: string;
  subject: string;
  grade: string;
  universityStudentsRate: {
    minimumRate: string | number;
    maximumRate: string | number;
  };
  partTimeTutorRate: {
    minimumRate: string | number;
    maximumRate: string | number;
  };
  fullTimeTutorRate: {
    minimumRate: string | number;
    maximumRate: string | number;
  };
  moeTeacherRate: {
    minimumRate: string | number;
    maximumRate: string | number;
  };
}

export function UpdateTuitionRate({
  id,
  subject,
  grade,
  universityStudentsRate,
  partTimeTutorRate,
  fullTimeTutorRate,
  moeTeacherRate,
}: UpdateTuitionRateProps) {
  const [open, setOpen] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const {
    reset,
    control,
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdateTuitionFormValues, unknown, UpdateTuitionSchema>({
    resolver: zodResolver(updateTuitionSchema),
    defaultValues: {
      subject: "",
      grade: "",
      universityStudentsRate: { minimumRate: "", maximumRate: "" },
      partTimeTutorRate: { minimumRate: "", maximumRate: "" },
      fullTimeTutorRate: { minimumRate: "", maximumRate: "" },
      moeTeacherRate: { minimumRate: "", maximumRate: "" },
    },
    mode: "onChange",
  });

  const [fetchTuitionRates] = useLazyFetchTuitionRatesQuery();
  const [updateTuition, { isLoading }] = useUpdateTuitionRateMutation();
  const selectedGrade = watch("grade");

  const { data: gradesData, isLoading: isGradesLoading } = useFetchGradesQuery({
    page: 1,
    limit: 50,
  });
  const { data: gradeDetails, isLoading: isGradeDetailsLoading } =
    useFetchGradeByIdQuery(selectedGrade || "", {
      skip: !selectedGrade,
    });

  const subjectOptions =
    gradeDetails?.subjects?.map((s) => ({ value: s.id, label: s.title })) || [];
  const gradeOptions = sortBySchoolGradeOrder(gradesData?.results || []).map(
    (g) => ({
      value: g.id,
      label: g.title,
    }),
  );

  const displayLoading = isGradeDetailsLoading || isGradesLoading;

  useEffect(() => {
    if (open) {
      reset({
        subject: subject || "",
        grade: grade || "",
        universityStudentsRate,
        partTimeTutorRate,
        fullTimeTutorRate,
        moeTeacherRate,
      });
    }
  }, [
    open,
    subject,
    grade,
    universityStudentsRate,
    partTimeTutorRate,
    fullTimeTutorRate,
    moeTeacherRate,
    reset,
  ]);

  useEffect(() => {
    if (!open || !selectedGrade || selectedGrade === grade) return;

    setValue("subject", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [grade, open, selectedGrade, setValue]);

  const onSubmit = async (data: UpdateTuitionSchema) => {
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
          id,
        )
      ) {
        return toast.error(DUPLICATE_TUITION_RATE_MESSAGE);
      }

      const payload = {
        id,
        subject: subjectId,
        grade: gradeId,
        universityStudentsRate: data.universityStudentsRate,
        partTimeTutorRate: data.partTimeTutorRate,
        fullTimeTutorRate: data.fullTimeTutorRate,
        moeTeacherRate: data.moeTeacherRate,
      };

      const result = await updateTuition(payload);
      const error = getErrorInApiResult(result);
      if (error) return toast.error(getTuitionRateErrorMessage(error));

      if ("data" in result) {
        toast.success("Tuition rate updated successfully");
        setOpen(false);
      }
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SquarePen className="cursor-pointer text-blue-500 hover:text-blue-700" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] bg-white z-9999 dark:bg-gray-800 dark:text-white/90 p-0 overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0">
        <DialogHeader className="shrink-0 px-6 py-4 border-b bg-white dark:bg-gray-800">
          <DialogTitle>Edit Tuition Rate</DialogTitle>
          <DialogDescription>
            Update the tuition rate information.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-6 py-6 grid gap-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="grid gap-1">
            <Label>
              Grade <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="grade"
              control={control}
              render={({ field }) => (
                <Select
                  options={gradeOptions}
                  value={field.value || undefined}
                  onChange={field.onChange}
                  placeholder="Select grade"
                />
              )}
            />
            {errors.grade && (
              <p className="text-red-500 text-sm">{errors.grade.message}</p>
            )}
          </div>

          <div className="grid gap-1">
            <Label>
              Subject <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="subject"
              control={control}
              render={({ field }) => (
                <Select
                  options={subjectOptions}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={
                    isGradeDetailsLoading
                      ? "Loading subjects..."
                      : "Select subject"
                  }
                  className="w-full"
                />
              )}
            />

            {errors.subject && (
              <p className="text-red-500 text-sm">{errors.subject.message}</p>
            )}
          </div>

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
                {...register(
                  `${key}.minimumRate` as const,
                  decimalInputRegisterOptions(
                    `${key}.minimumRate` as const,
                    setValue,
                    true,
                    () => {
                      trigger([
                        `${key}.minimumRate` as const,
                        `${key}.maximumRate` as const,
                      ]);
                    },
                  ),
                )}
              />
              {errors[key]?.minimumRate && (
                <p className="text-red-500 text-sm">
                  {errors[key]?.minimumRate?.message}
                </p>
              )}

              <Input
                placeholder="Maximum Rate"
                inputMode="decimal"
                {...register(
                  `${key}.maximumRate` as const,
                  decimalInputRegisterOptions(
                    `${key}.maximumRate` as const,
                    setValue,
                    true,
                    () => {
                      trigger([
                        `${key}.minimumRate` as const,
                        `${key}.maximumRate` as const,
                      ]);
                    },
                  ),
                )}
              />
              {errors[key]?.maximumRate && (
                <p className="text-red-500 text-sm">
                  {errors[key]?.maximumRate?.message}
                </p>
              )}
            </div>
          ))}

          <DialogFooter className="shrink-0 px-6 py-4 border-t bg-white dark:bg-gray-800">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              className="bg-blue-700 text-white hover:bg-blue-500"
              isLoading={isLoading || isCheckingDuplicate}
              disabled={displayLoading || !isDirty || isCheckingDuplicate}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
