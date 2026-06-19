"use client";

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

import MultiSelect from "@/components/form/MultiSelect";
import { useUpdateGradeMutation } from "@/store/api/splits/grades";
import { useFetchSubjectsQuery } from "@/store/api/splits/subjects";
import { getErrorInApiResult } from "@/utils/api";
import { liveTextInputRegisterOptions } from "@/utils/form-normalizers";
import { zodResolver } from "@hookform/resolvers/zod";
import { SquarePen } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { UpdateGradeSchema, updateGradeSchema } from "./schema";

interface UpdateGradeProps {
  id: string;
  title: string;
  description: string;
  subjects: string[];
}

export function UpdateGrade({
  id,
  title,
  description,
  subjects,
}: UpdateGradeProps) {
  const [open, setOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<UpdateGradeSchema | null>(
    null,
  );

  const updateGradeForm = useForm<UpdateGradeSchema>({
    resolver: zodResolver(updateGradeSchema),
    defaultValues: { title: "", description: "", subjects: [] },
    mode: "onChange",
  });

  const {
    reset,
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = updateGradeForm;

  const watched = watch();

  const isFormChanged =
    initialValues !== null
      ? JSON.stringify(watched) !== JSON.stringify(initialValues)
      : false;

  const [updateGrade, { isLoading }] = useUpdateGradeMutation();
  const { data: subjectsData } = useFetchSubjectsQuery({
    page: 1,
    limit: 100000,
  });

  const subjectOptions =
    subjectsData?.results?.map((s) => ({
      text: s.title,
      value: s.id,
    })) || [];

  useEffect(() => {
    if (open && subjectsData) {
      const subjectIds = subjects
        .map((title) => {
          const found = subjectsData.results.find((s) => s.title === title);
          return found ? found.id : null;
        })
        .filter(Boolean) as string[];

      const iv: UpdateGradeSchema = {
        title,
        description,
        subjects: subjectIds,
      };

      reset(iv);
      setInitialValues(iv);
    }
  }, [open, title, description, subjects, subjectsData, reset]);

  const onSubmit = async (data: UpdateGradeSchema) => {
    try {
      const result = await updateGrade({ id, ...data });
      const error = getErrorInApiResult(result);

      if (error) return toast.error(error);

      if ("data" in result) {
        toast.success("Grade updated successfully");
        setOpen(false);
      }
    } catch (error) {
      console.error("Unexpected error during grade update:", error);
      toast.error("An unexpected error occurred while updating the grade.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SquarePen className="cursor-pointer text-blue-500 hover:text-blue-700" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-white z-9999 dark:bg-gray-800 dark:text-white/90 p-0 overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <DialogHeader className="shrink-0 px-6 py-4 border-b bg-white dark:bg-gray-800">
            <DialogTitle>Edit Grade</DialogTitle>
            <DialogDescription>Edit the grade details.</DialogDescription>
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
                  liveTextInputRegisterOptions("title", setValue),
                )}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="description"
                placeholder="Description"
                {...register(
                  "description",
                  liveTextInputRegisterOptions("description", setValue),
                )}
              />
              {errors.description && (
                <p className="text-sm text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="subjects">
                Subjects <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="subjects"
                render={({ field }) => (
                  <MultiSelect
                    label=""
                    options={subjectOptions}
                    defaultSelected={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.subjects && (
                <p className="text-sm pl-1 text-red-500">
                  {errors.subjects.message}
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
              disabled={!isFormChanged || isLoading}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
