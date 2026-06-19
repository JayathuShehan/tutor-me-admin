"use client";

import TextArea from "@/components/form/input/TextArea";
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
  useCreateSubjectMutation,
  useLazyFetchSubjectsQuery,
} from "@/store/api/splits/subjects";
import { getErrorInApiResult } from "@/utils/api";
import { liveTextInputRegisterOptions } from "@/utils/form-normalizers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  CreateSubjectSchema,
  createSubjectSchema,
  initialFormValues,
} from "./schema";
import {
  DUPLICATE_SUBJECT_TITLE_MESSAGE,
  getSubjectTitleErrorMessage,
  hasDuplicateSubjectTitle,
} from "../subject-title-validation";

export function AddSubject() {
  const [open, setOpen] = useState(false);
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);
  const [createSubject, { isLoading }] = useCreateSubjectMutation();
  const [fetchSubjects] = useLazyFetchSubjectsQuery();

  const createSubjectForm = useForm<CreateSubjectSchema>({
    resolver: zodResolver(createSubjectSchema),
    defaultValues: initialFormValues,
    mode: "onChange",
  });

  const { formState } = createSubjectForm;

  const onSubmit = async (data: CreateSubjectSchema) => {
    try {
      setIsCheckingTitle(true);
      const subjectsData = await fetchSubjects({
        page: 1,
        limit: 1000,
      }).unwrap();
      setIsCheckingTitle(false);

      if (hasDuplicateSubjectTitle(subjectsData.results, data.title)) {
        return toast.error(DUPLICATE_SUBJECT_TITLE_MESSAGE);
      }

      const result = await createSubject(data);
      const error = getErrorInApiResult(result);
      if (error) {
        return toast.error(getSubjectTitleErrorMessage(error));
      }
      if ("data" in result) {
        onRegisterSuccess();
      }
    } catch (error) {
      console.error("Unexpected error during subject creation:", error);
      toast.error("An unexpected error occurred while creating the subject");
    } finally {
      setIsCheckingTitle(false);
    }
  };

  const onRegisterSuccess = () => {
    createSubjectForm.reset();
    toast.success("Subject created successfully");
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          createSubjectForm.reset();
        }
      }}
    >
      <form onSubmit={createSubjectForm.handleSubmit(onSubmit)}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="bg-blue-700 text-white hover:bg-blue-500"
          >
            Add Subject
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-white z-50 dark:bg-gray-800 dark:text-white/90">
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>
              Add a new subject to the list.
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
                {...createSubjectForm.register("title", {
                  ...liveTextInputRegisterOptions(
                    "title",
                    createSubjectForm.setValue,
                    formState.isSubmitted,
                  ),
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
              <TextArea
                id="description"
                placeholder="Description"
                {...createSubjectForm.register(
                  "description",
                  liveTextInputRegisterOptions(
                    "description",
                    createSubjectForm.setValue,
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
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              className="bg-blue-700 text-white hover:bg-blue-500"
              isLoading={isLoading || isCheckingTitle}
              onClick={createSubjectForm.handleSubmit(onSubmit)}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
