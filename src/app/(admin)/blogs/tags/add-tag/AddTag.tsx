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
import { initialFormValues, tagSchema, TagSchema } from "@/schemas/tag.schema";
import {
  useCreateTagMutation,
  useLazyFetchTagsQuery,
} from "@/store/api/splits/tags";
import { getErrorInApiResult } from "@/utils/api";
import { liveTextInputRegisterOptions } from "@/utils/form-normalizers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  DUPLICATE_TAG_TITLE_MESSAGE,
  getTagTitleErrorMessage,
  hasDuplicateTagTitle,
} from "../tag-title-validation";

export function AddTag() {
  const [open, setOpen] = useState(false);
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);
  const [createTag, { isLoading }] = useCreateTagMutation();
  const [fetchTags] = useLazyFetchTagsQuery();

  const createTagForm = useForm<TagSchema>({
    resolver: zodResolver(tagSchema),
    defaultValues: initialFormValues,
    mode: "onChange",
  });

  const { formState, reset } = createTagForm;

  const onSubmit = async (data: TagSchema) => {
    try {
      setIsCheckingTitle(true);
      const tagsData = await fetchTags({
        page: 1,
        limit: 1000,
      }).unwrap();
      setIsCheckingTitle(false);

      if (hasDuplicateTagTitle(tagsData.results, data.name)) {
        return toast.error(DUPLICATE_TAG_TITLE_MESSAGE);
      }

      const result = await createTag(data);
      const error = getErrorInApiResult(result);
      if (error) {
        return toast.error(getTagTitleErrorMessage(error));
      }
      if ("data" in result) {
        onRegisterSuccess();
      }
    } catch (error) {
      console.error("Unexpected error during tag creation:", error);
      toast.error("An unexpected error occurred while creating the tag");
    } finally {
      setIsCheckingTitle(false);
    }
  };

  const onRegisterSuccess = () => {
    reset(initialFormValues);
    toast.success("Tag created successfully");
    setOpen(false);
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen) {
      reset(initialFormValues);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <form onSubmit={createTagForm.handleSubmit(onSubmit)}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="bg-blue-700 text-white hover:bg-blue-500"
          >
            Add Tag
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[425px] bg-white z-50 dark:bg-gray-800 dark:text-white/90">
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
            <DialogDescription>Add a new tag to the list.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Title */}
            <div className="grid gap-3">
              <Label htmlFor="name">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Title"
                {...createTagForm.register(
                  "name",
                  liveTextInputRegisterOptions(
                    "name",
                    createTagForm.setValue,
                    formState.isSubmitted,
                  ),
                )}
              />
              {formState.errors.name && (
                <p className="text-sm text-red-500">
                  {formState.errors.name.message}
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
                {...createTagForm.register(
                  "description",
                  liveTextInputRegisterOptions(
                    "description",
                    createTagForm.setValue,
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
              <Button
                variant="outline"
                onClick={() => reset(initialFormValues)}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="bg-blue-700 text-white hover:bg-blue-500"
              isLoading={isLoading || isCheckingTitle}
              onClick={createTagForm.handleSubmit(onSubmit)}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
