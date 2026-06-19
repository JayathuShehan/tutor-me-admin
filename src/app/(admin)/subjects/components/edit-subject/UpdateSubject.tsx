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
import { Textarea } from "@/components/ui/textarea";
import {
  useLazyFetchSubjectsQuery,
  useUpdateSubjectMutation,
} from "@/store/api/splits/subjects";
import { getErrorInApiResult } from "@/utils/api";
import { liveTextInputRegisterOptions } from "@/utils/form-normalizers";
import { zodResolver } from "@hookform/resolvers/zod";
import { SquarePen } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  DUPLICATE_SUBJECT_TITLE_MESSAGE,
  getSubjectTitleErrorMessage,
  hasDuplicateSubjectTitle,
} from "../subject-title-validation";
import { UpdateSubjectSchema, updateSubjectSchema } from "./schema";

interface UpdateSubjectProps {
  id: string;
  title: string;
  description: string;
}

export function UpdateSubject({ id, title, description }: UpdateSubjectProps) {
  const [open, setOpen] = useState(false);
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);

  const updateSubjectForm = useForm<UpdateSubjectSchema>({
    resolver: zodResolver(updateSubjectSchema),
    defaultValues: { title, description },
    mode: "onChange",
  });

  const {
    handleSubmit,
    register,
    reset,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = updateSubjectForm;

  useEffect(() => {
    reset({ title, description });
  }, [title, description, reset]);

  const [fetchSubjects] = useLazyFetchSubjectsQuery();
  const [updateSubject, { isLoading }] = useUpdateSubjectMutation();

  const handleDialogClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      reset({ title, description });
    }
  };

  const handleCancel = () => {
    reset({ title, description });
    setOpen(false);
  };

  const onSubmit = async (data: UpdateSubjectSchema) => {
    try {
      setIsCheckingTitle(true);
      const subjectsData = await fetchSubjects({
        page: 1,
        limit: 1000,
      }).unwrap();
      setIsCheckingTitle(false);

      if (hasDuplicateSubjectTitle(subjectsData.results, data.title, id)) {
        return toast.error(DUPLICATE_SUBJECT_TITLE_MESSAGE);
      }

      const result = await updateSubject({ id, ...data });
      const error = getErrorInApiResult(result);
      if (error) {
        return toast.error(getSubjectTitleErrorMessage(error));
      }
      if ("data" in result) {
        onUpdateSuccess();
      }
    } catch (error) {
      console.error("Unexpected error during subject update:", error);
      toast.error("An unexpected error occurred while updating the subject");
    } finally {
      setIsCheckingTitle(false);
    }
  };

  const onUpdateSuccess = () => {
    const updatedValues = getValues();
    setOpen(false);
    reset(updatedValues);
    toast.success("Subject updated successfully");
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTrigger asChild>
          <SquarePen className="cursor-pointer text-blue-500 hover:text-blue-700" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-white z-50 dark:bg-gray-800 dark:text-white/90">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>Edit the subject details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
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
              <Textarea
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
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="bg-blue-700 text-white hover:bg-blue-500"
              isLoading={isLoading || isCheckingTitle}
              disabled={!isDirty || isCheckingTitle}
              onClick={updateSubjectForm.handleSubmit(onSubmit)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
