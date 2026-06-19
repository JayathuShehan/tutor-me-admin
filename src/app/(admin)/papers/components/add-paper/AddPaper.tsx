"use client";

import FileUploadDropzone from "@/components/fileUploader";
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
import { MEDIUM_VALUES } from "@/configs/app-constants";
import { useDebounce } from "@/hooks/useDebounce";
import {
  initialFormValues,
  PaperFormValues,
  PaperSchema,
  paperSchema,
} from "@/schemas/paper.schema";
import {
  useFetchGradeByIdQuery,
  useFetchGradesQuery,
} from "@/store/api/splits/grades";
import { useCreatePaperMutation } from "@/store/api/splits/papers";
import { getErrorInApiResult } from "@/utils/api";
import { liveTextInputRegisterOptions } from "@/utils/form-normalizers";
import { sortBySchoolGradeOrder } from "@/utils/grade-filter-order";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

export function AddPaper() {
  const [open, setOpen] = useState(false);
  const [createPaper, { isLoading }] = useCreatePaperMutation();
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [gradeSearch, setGradeSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const debouncedGradeSearch = useDebounce(gradeSearch, 300);

  const createPaperForm = useForm<PaperFormValues, unknown, PaperSchema>({
    resolver: zodResolver(paperSchema),
    defaultValues: initialFormValues,
    mode: "onChange",
  });

  const { handleSubmit, register, watch, setValue, reset, formState } =
    createPaperForm;

  const selectedGrade = watch("grade");
  const watchedUrl = watch("url");

  const { data: gradeDetails, isLoading: isGradeDetailsLoading } =
    useFetchGradeByIdQuery(selectedGradeId ?? "", {
      skip: !selectedGradeId,
    });

  const { data: gradeData, isLoading: isGradesLoading } = useFetchGradesQuery({
    title: debouncedGradeSearch,
    limit: 100,
  });

  const filteredSubjects = gradeDetails?.subjects?.filter((subject) =>
    subject.title.toLowerCase().includes(subjectSearch.toLowerCase()),
  );

  useEffect(() => {
    if (selectedGrade) {
      setSelectedGradeId(selectedGrade);
    } else {
      setSelectedGradeId(null);
    }

    setValue("subject", "", {
      shouldDirty: true,
      shouldValidate: false,
      shouldTouch: false,
    });
  }, [selectedGrade, setValue]);

  const onSubmit = async (data: PaperSchema) => {
    try {
      const result = await createPaper(data);
      const error = getErrorInApiResult(result);

      if (error) {
        toast.error(error);
        return;
      }

      if ("data" in result) {
        toast.success("Paper created successfully");
        reset(initialFormValues);
        setSelectedGradeId(null);
        setGradeSearch("");
        setSubjectSearch("");
        setOpen(false);
      }
    } catch (err) {
      console.error("Unexpected error during paper creation:", err);
      toast.error("An unexpected error occurred while creating the paper");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);

        if (!isOpen) {
          reset(initialFormValues);
          setSelectedGradeId(null);
          setGradeSearch("");
          setSubjectSearch("");
        }
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="bg-blue-700 text-white hover:bg-blue-500"
          >
            Add Paper
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[425px] bg-white z-50 dark:bg-gray-800 dark:text-white/90 p-0 overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0">
          <DialogHeader className="shrink-0 px-6 py-4 border-b bg-white dark:bg-gray-800">
            <DialogTitle>Add Paper</DialogTitle>
            <DialogDescription>Add a new paper to the list.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-6 py-4 grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Title"
                {...register(
                  "title",
                  liveTextInputRegisterOptions(
                    "title",
                    setValue,
                    formState.isSubmitted,
                  ),
                )}
              />
              {formState.errors.title && (
                <p className="text-sm text-red-500">
                  {formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="medium">
                Medium <span className="text-red-500">*</span>
              </Label>

              <Select
                value={watch("medium")}
                onValueChange={(value) =>
                  setValue(
                    "medium",
                    value as import("@/configs/app-constants").MediumValue,
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                      shouldTouch: true,
                    },
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select medium" />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Medium</SelectLabel>
                    {MEDIUM_VALUES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {formState.errors.medium && (
                <p className="text-sm text-red-500">
                  {formState.errors.medium.message}
                </p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="grade">
                Grade <span className="text-red-500">*</span>
              </Label>

              <Select
                value={watch("grade")}
                disabled={isGradesLoading}
                onValueChange={(value) =>
                  setValue("grade", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                    shouldTouch: true,
                  })
                }
              >
                <SelectTrigger className="w-full" disabled={isGradesLoading}>
                  <SelectValue placeholder="Select a grade" />
                </SelectTrigger>

                <SelectContent className="w-full">
                  <div className="border-b p-2">
                    <Input
                      placeholder="Search grade..."
                      value={gradeSearch}
                      onChange={(e) => setGradeSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>

                  <SelectGroup>
                    <SelectLabel>Grades</SelectLabel>

                    {gradeData?.results?.length === 0 && (
                      <div className="p-3 text-sm text-gray-500">
                        No results found.
                      </div>
                    )}

                    {sortBySchoolGradeOrder(gradeData?.results || []).map(
                      (grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.title}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>

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
                value={watch("subject")}
                disabled={!selectedGradeId || isGradeDetailsLoading}
                onValueChange={(value) =>
                  setValue("subject", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                    shouldTouch: true,
                  })
                }
              >
                <SelectTrigger
                  className="w-full"
                  isLoading={isGradeDetailsLoading}
                >
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>

                <SelectContent className="w-full">
                  <div className="border-b p-2">
                    <Input
                      placeholder="Search subject..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>

                  <SelectGroup>
                    <SelectLabel>Subjects</SelectLabel>

                    {filteredSubjects?.length === 0 && (
                      <div className="p-3 text-sm text-gray-500">
                        No results found.
                      </div>
                    )}

                    {filteredSubjects?.map((subject) => (
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

            <div className="grid gap-3">
              <Label htmlFor="year">
                Year <span className="text-red-500">*</span>
              </Label>
              <Input
                id="year"
                placeholder="Year"
                type="text"
                {...register(
                  "year",
                  liveTextInputRegisterOptions(
                    "year",
                    setValue,
                    formState.isSubmitted,
                  ),
                )}
              />
              {formState.errors.year && (
                <p className="text-sm text-red-500">
                  {formState.errors.year.message}
                </p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="url">
                Paper File <span className="text-red-500">*</span>
              </Label>

              <FileUploadDropzone
                onUploaded={(url) => {
                  setValue("url", url, {
                    shouldDirty: true,
                    shouldValidate: true,
                    shouldTouch: true,
                  });
                }}
              />

              {watchedUrl && (
                <a
                  href={watchedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 break-all text-blue-600 hover:underline"
                >
                  View Uploaded Paper
                </a>
              )}

              {formState.errors.url && (
                <p className="text-sm text-red-500">
                  {formState.errors.url.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 px-6 py-4 border-t bg-white dark:bg-gray-800">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>

            <Button
              type="submit"
              className="bg-blue-700 text-white hover:bg-blue-500"
              isLoading={isLoading}
              onClick={handleSubmit(onSubmit)}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
