"use client";

import MultiSelect from "@/components/form/MultiSelect";
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
  useCreateGradeMutation,
  useFetchGradesQuery,
} from "@/store/api/splits/grades";
import { useFetchSubjectsQuery } from "@/store/api/splits/subjects";
import { getErrorInApiResult } from "@/utils/api";
import { liveTextInputRegisterOptions } from "@/utils/form-normalizers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  CreateGradeSchema,
  createGradeSchema,
  initialFormValues,
} from "./schema";

export function AddGrade() {
  const [open, setOpen] = useState(false);
  const { data: gradesData } = useFetchGradesQuery({ page: 1, limit: 100 });
  const existingTitles =
    gradesData?.results.map((g) => g.title.toLowerCase()) || [];

  const createGradeForm = useForm<CreateGradeSchema>({
    resolver: zodResolver(createGradeSchema),
    defaultValues: initialFormValues,
    mode: "onChange",
  });
  const { formState } = createGradeForm;

  const [createGrade, { isLoading }] = useCreateGradeMutation();
  const { data: subjectsData, isLoading: subjectsLoading } =
    useFetchSubjectsQuery({ page: 1, limit: 100000 });

  const subjectOptions =
    subjectsData?.results.map((s) => ({
      value: s.id,
      text: s.title,
      selected: false,
    })) || [];

  const onSubmit = async (data: CreateGradeSchema) => {
    try {
      console.log("Submitting grade:", data);

      const result = await createGrade(data);
      const error = getErrorInApiResult(result);
      if (error) return toast.error(error);

      if ("data" in result) {
        onRegisterSuccess();
      }
    } catch (error) {
      console.error("Unexpected error during grade creation:", error);
      toast.error("An unexpected error occurred while creating the grade.");
    }
  };

  const onRegisterSuccess = () => {
    createGradeForm.reset();
    toast.success("Grade created successfully");
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          createGradeForm.reset();
        }
      }}
    >
      <form onSubmit={createGradeForm.handleSubmit(onSubmit)}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="bg-blue-700 text-white hover:bg-blue-500"
          >
            Add Grade
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[425px] bg-white z-[9999] dark:bg-gray-800 dark:text-white/90">
          <DialogHeader>
            <DialogTitle>Add Grade</DialogTitle>
            <DialogDescription>
              Add a new grade to the list. {subjectsLoading ? "..." : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Title"
                {...createGradeForm.register("title", {
                  ...liveTextInputRegisterOptions(
                    "title",
                    createGradeForm.setValue,
                    formState.isSubmitted,
                  ),
                  validate: (value) => {
                    if (existingTitles.includes(value.toLowerCase())) {
                      return "This grade title already exists.";
                    }
                    return true;
                  },
                })}
              />
              {formState.errors.title && (
                <p className="text-sm text-red-500">
                  {formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="description"
                placeholder="Description"
                type="text"
                {...createGradeForm.register(
                  "description",
                  liveTextInputRegisterOptions(
                    "description",
                    createGradeForm.setValue,
                    formState.isSubmitted,
                  ),
                )}
              />
              {formState.errors.description && (
                <p className="text-sm text-red-500">
                  {formState.errors.description.message}
                </p>
              )}
            </div>
            <div className="grid gap-3">
              <Label>
                Subjects <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="subjects"
                control={createGradeForm.control}
                render={({ field }) => (
                  <MultiSelect
                    label=""
                    options={subjectOptions}
                    defaultSelected={field.value || []}
                    onChange={(values) => field.onChange(values)}
                    disabled={subjectsLoading}
                    isLoading={subjectsLoading}
                  />
                )}
              />
              {formState.errors.subjects && (
                <p className="text-sm pl-1 text-red-500">
                  {formState.errors.subjects.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              className="bg-blue-700 text-white hover:bg-blue-500"
              isLoading={isLoading}
              onClick={createGradeForm.handleSubmit(onSubmit)}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
