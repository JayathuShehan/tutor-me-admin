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

import { MEDIUM_OPTIONS } from "@/configs/app-constants";
import { useDebounce } from "@/hooks/useDebounce";
import {
  PaperFormValues,
  PaperSchema,
  paperSchema,
} from "@/schemas/paper.schema";
import {
  useFetchGradeByIdQuery,
  useFetchGradesQuery,
} from "@/store/api/splits/grades";
import { useUpdatePaperMutation } from "@/store/api/splits/papers";
import { getErrorInApiResult } from "@/utils/api";
import { liveTextInputRegisterOptions } from "@/utils/form-normalizers";
import { sortBySchoolGradeOrder } from "@/utils/grade-filter-order";
import { zodResolver } from "@hookform/resolvers/zod";
import { SquarePen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

interface EditPaperProps {
  id: string;
  title: string;
  medium: string;
  grade: string | { id: string; title: string };
  subject: string | { id: string; title: string };
  year: string;
  url: string;
}

interface Subject {
  id: string;
  title: string;
}

interface GradeOption {
  id: string;
  title: string;
}

export function EditPaper({
  id,
  title,
  medium,
  grade,
  subject,
  year,
  url,
}: EditPaperProps) {
  const [open, setOpen] = useState(false);

  const gradeId = typeof grade === "string" ? grade : grade.id;
  const subjectId = typeof subject === "string" ? subject : subject.id;

  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(
    gradeId,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(url || null);
  const [gradeSearch, setGradeSearch] = useState("");
  const debouncedGradeSearch = useDebounce(gradeSearch, 300);
  const [subjectSearch, setSubjectSearch] = useState("");

  const updatePaperForm = useForm<PaperFormValues, unknown, PaperSchema>({
    resolver: zodResolver(paperSchema),
    mode: "onChange",
  });

  const [updatePaper, { isLoading }] = useUpdatePaperMutation();

  const { data: gradeData } = useFetchGradesQuery(
    debouncedGradeSearch
      ? { title: debouncedGradeSearch, limit: 100 }
      : { limit: 100 },
  );

  const { data: gradeDetails, isLoading: isGradeDetailsLoading } =
    useFetchGradeByIdQuery(selectedGradeId!, { skip: !selectedGradeId });

  const { formState, watch, setValue, register, reset, getValues } =
    updatePaperForm;

  const selectedGrade = watch("grade");
  const [initialValues, setInitialValues] = useState<PaperFormValues | null>(
    null,
  );

  const gradeOptions = useMemo(() => {
    const options: GradeOption[] = gradeData?.results || [];

    if (!gradeDetails?.id || !gradeDetails.title) {
      return sortBySchoolGradeOrder(options);
    }

    const hasSelectedGrade = options.some(
      (option) => option.id === gradeDetails.id,
    );

    if (hasSelectedGrade) {
      return sortBySchoolGradeOrder(options);
    }

    return sortBySchoolGradeOrder([gradeDetails, ...options]);
  }, [gradeData?.results, gradeDetails]);

  const selectedGradeTitle = useMemo(
    () => gradeOptions.find((option) => option.id === selectedGrade)?.title,
    [gradeOptions, selectedGrade],
  );

  const handleGradeChange = (value: string) => {
    setValue("grade", value, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    setValue("subject", "", {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    setSelectedGradeId(value);
    setSubjectSearch("");
  };

  const handleDialogClose = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen && initialValues) {
      reset(initialValues, {
        keepDirty: false,
        keepTouched: false,
      });
      setSubjectSearch("");
      setSelectedGradeId(initialValues.grade || null);
      setPreviewUrl(initialValues.url || null);
    }
  };

  const handleCancel = () => {
    if (initialValues) {
      reset(initialValues, {
        keepDirty: false,
        keepTouched: false,
      });
      setSelectedGradeId(initialValues.grade);
      setPreviewUrl(initialValues.url);
      setSubjectSearch("");
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open || !gradeDetails) return;
    if (gradeDetails.id !== gradeId) return;

    const subjectExists = gradeDetails.subjects?.some(
      (s: Subject) => s.id === subjectId,
    );

    const defaults: PaperFormValues = {
      title,
      medium: medium as "Sinhala" | "English" | "Tamil",
      grade: gradeId,
      subject: subjectExists ? subjectId : "",
      year,
      url,
    };

    reset(defaults, {
      keepDirty: false,
      keepTouched: false,
    });

    setInitialValues(defaults);
    setSelectedGradeId(gradeId);
    setPreviewUrl(url);
    setSubjectSearch("");
  }, [open, gradeDetails, gradeId, medium, reset, subjectId, title, url, year]);

  useEffect(() => {
    if (!selectedGrade) return;

    if (selectedGrade !== selectedGradeId) {
      setSelectedGradeId(selectedGrade);
      setSubjectSearch("");
    }
  }, [selectedGrade, selectedGradeId]);

  const filteredSubjects =
    gradeDetails?.subjects?.filter((sub: Subject) =>
      sub.title.toLowerCase().includes(subjectSearch.toLowerCase()),
    ) ?? [];

  const onSubmit = async (data: PaperSchema) => {
    try {
      const result = await updatePaper({ id, ...data });
      const error = getErrorInApiResult(result);

      if (error) return toast.error(error);

      if ("data" in result) {
        toast.success("Paper updated successfully");

        const updatedValues = getValues();
        setInitialValues(updatedValues);
        reset(updatedValues, {
          keepDirty: false,
          keepTouched: false,
        });
        setPreviewUrl(updatedValues.url);

        setOpen(false);
      }
    } catch (error) {
      console.error("Unexpected error during paper update:", error);
      toast.error("An unexpected error occurred while updating the paper.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <SquarePen className="cursor-pointer text-blue-500 hover:text-blue-700" />
      </DialogTrigger>

      <DialogContent className="w-[95vw] max-w-[425px] max-h-[85vh] overflow-hidden bg-white z-50 dark:bg-gray-800 dark:text-white/90 p-0 [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0">
        <form
          onSubmit={updatePaperForm.handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0 overflow-hidden min-w-0"
        >
          <DialogHeader className="shrink-0 px-6 py-4 border-b bg-white dark:bg-gray-800">
            <DialogTitle>Edit Paper</DialogTitle>
            <DialogDescription>Edit the paper details.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto scrollbar-thin px-6 py-4 grid min-w-0 gap-4">
            <div className="grid min-w-0 gap-3">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                {...register(
                  "title",
                  liveTextInputRegisterOptions("title", setValue),
                )}
                className="w-full min-w-0"
              />
              {formState.errors.title && (
                <p className="text-sm text-red-500">
                  {formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="grid min-w-0 gap-3">
              <Label>
                Medium <span className="text-red-500">*</span>
              </Label>

              <Select
                value={watch("medium")}
                onValueChange={(value) =>
                  setValue("medium", value as "Sinhala" | "English" | "Tamil", {
                    shouldDirty: true,
                    shouldValidate: true,
                    shouldTouch: true,
                  })
                }
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Select medium" />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Medium</SelectLabel>
                    {MEDIUM_OPTIONS.map(({ label, value }) => (
                      <SelectItem key={value} value={value}>
                        {label}
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

            <div className="grid min-w-0 gap-3">
              <Label>
                Grade <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch("grade") || ""}
                onValueChange={handleGradeChange}
              >
                <SelectTrigger className="w-full min-w-0">
                  {selectedGradeTitle ? (
                    <SelectValue>{selectedGradeTitle}</SelectValue>
                  ) : (
                    <SelectValue placeholder="Select a grade" />
                  )}
                </SelectTrigger>

                <SelectContent>
                  <div className="border-b p-2">
                    <Input
                      placeholder="Search grade..."
                      value={gradeSearch}
                      onChange={(e) => setGradeSearch(e.target.value)}
                      className="h-8 w-full min-w-0"
                    />
                  </div>

                  <SelectGroup>
                    <SelectLabel>Grades</SelectLabel>

                    {gradeOptions.length === 0 && (
                      <div className="p-3 text-sm text-gray-500">
                        No results found.
                      </div>
                    )}

                    {gradeOptions.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {formState.errors.grade && (
                <p className="text-sm text-red-500">
                  {formState.errors.grade.message}
                </p>
              )}
            </div>

            <div className="grid min-w-0 gap-3">
              <Label>
                Subject <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch("subject") || ""}
                onValueChange={(value) =>
                  setValue("subject", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                    shouldTouch: true,
                  })
                }
                disabled={!selectedGradeId || isGradeDetailsLoading}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>

                <SelectContent>
                  <div className="border-b p-2">
                    <Input
                      placeholder="Search subject..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      className="h-8 w-full min-w-0"
                    />
                  </div>

                  <SelectGroup>
                    <SelectLabel>Subjects</SelectLabel>

                    {filteredSubjects.length === 0 && (
                      <div className="p-3 text-sm text-gray-500">
                        No results found.
                      </div>
                    )}

                    {filteredSubjects.map((sub: Subject) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.title}
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

            <div className="grid min-w-0 gap-3">
              <Label>
                Year <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                {...register(
                  "year",
                  liveTextInputRegisterOptions("year", setValue),
                )}
                className="w-full min-w-0"
              />
              {formState.errors.year && (
                <p className="text-sm text-red-500">
                  {formState.errors.year.message}
                </p>
              )}
            </div>

            <div className="grid min-w-0 gap-3">
              <Label>
                Paper File <span className="text-red-500">*</span>
              </Label>

              {previewUrl && (
                <p className="w-full min-w-0 break-all text-sm text-gray-600 dark:text-gray-300">
                  {previewUrl}
                </p>
              )}

              <div className="min-w-0 overflow-x-hidden">
                <FileUploadDropzone
                  onUploaded={(uploadedUrl) => {
                    setValue("url", uploadedUrl, {
                      shouldDirty: true,
                      shouldValidate: true,
                      shouldTouch: true,
                    });
                    setPreviewUrl(uploadedUrl);
                  }}
                />
              </div>

              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 break-all text-blue-600 underline dark:text-blue-400"
                >
                  View Uploaded File
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
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </DialogClose>

            <Button
              type="submit"
              className="bg-blue-700 text-white hover:bg-blue-500"
              isLoading={isLoading}
              disabled={!formState.isDirty}
              onClick={updatePaperForm.handleSubmit(onSubmit)}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
