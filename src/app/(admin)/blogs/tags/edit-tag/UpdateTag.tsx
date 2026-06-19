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
import { tagSchema, TagSchema } from "@/schemas/tag.schema";
import {
  useLazyFetchTagsQuery,
  useUpdateTagMutation,
} from "@/store/api/splits/tags";
import { getErrorInApiResult } from "@/utils/api";
import { liveTextInputRegisterOptions } from "@/utils/form-normalizers";
import { zodResolver } from "@hookform/resolvers/zod";
import { SquarePen } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  DUPLICATE_TAG_TITLE_MESSAGE,
  getTagTitleErrorMessage,
  hasDuplicateTagTitle,
} from "../tag-title-validation";

interface UpdateTagProps {
  id: string;
  name: string;
  description: string;
}

export function UpdateTag({ id, name, description }: UpdateTagProps) {
  const [open, setOpen] = useState(false);
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);

  const updateTagForm = useForm<TagSchema>({
    resolver: zodResolver(tagSchema),
    defaultValues: { name, description },
    mode: "onChange",
  });

  const {
    handleSubmit,
    register,
    reset,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = updateTagForm;

  useEffect(() => {
    reset({ name, description });
  }, [name, description, reset]);

  const [fetchTags] = useLazyFetchTagsQuery();
  const [updateTag, { isLoading }] = useUpdateTagMutation();

  const handleDialogClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      reset({ name, description });
    }
  };

  const handleCancel = () => {
    reset({ name, description });
    setOpen(false);
  };

  const onSubmit = async (data: TagSchema) => {
    try {
      setIsCheckingTitle(true);
      const tagsData = await fetchTags({
        page: 1,
        limit: 1000,
      }).unwrap();
      setIsCheckingTitle(false);

      if (hasDuplicateTagTitle(tagsData.results, data.name, id)) {
        return toast.error(DUPLICATE_TAG_TITLE_MESSAGE);
      }

      const result = await updateTag({ id, ...data });
      const error = getErrorInApiResult(result);
      if (error) {
        return toast.error(getTagTitleErrorMessage(error));
      }
      if ("data" in result) {
        onUpdateSuccess();
      }
    } catch (error) {
      console.error("Unexpected error during tag update:", error);
      toast.error("An unexpected error occurred while updating the tag");
    } finally {
      setIsCheckingTitle(false);
    }
  };

  const onUpdateSuccess = () => {
    const updatedValues = getValues();
    setOpen(false);
    reset(updatedValues);
    toast.success("Tag updated successfully");
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTrigger asChild>
          <SquarePen className="cursor-pointer text-blue-500 hover:text-blue-700" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-white z-50 dark:bg-gray-800 dark:text-white/90">
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>Edit the tag details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Title"
                {...register(
                  "name",
                  liveTextInputRegisterOptions("name", setValue),
                )}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
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
              onClick={updateTagForm.handleSubmit(onSubmit)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
