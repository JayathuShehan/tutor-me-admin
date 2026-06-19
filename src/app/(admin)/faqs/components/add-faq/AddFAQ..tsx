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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FAQ_CATEGORY_OPTIONS } from "@/lib/faq-categories";
import { useCreateFaqMutation } from "@/store/api/splits/faqs";
import { getErrorInApiResult } from "@/utils/api";
import { liveTextInputRegisterOptions } from "@/utils/form-normalizers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  CreateFaqFormValues,
  CreateFaqSchema,
  createFaqSchema,
  initialFaqFormValues,
} from "./schema";

export function AddFAQ() {
  const [open, setOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<CreateFaqFormValues, unknown, CreateFaqSchema>({
    resolver: zodResolver(createFaqSchema),
    defaultValues: initialFaqFormValues,
    mode: "onChange",
  });

  const [createFaq, { isLoading }] = useCreateFaqMutation();

  const onSubmit = async (data: CreateFaqSchema) => {
    try {
      const result = await createFaq(data);
      const error = getErrorInApiResult(result);
      if (error) {
        return toast.error(error);
      }
      if ("data" in result) {
        onRegisterSuccess();
      }
    } catch (error) {
      console.error("Unexpected error during FAQ creation:", error);
      toast.error("An unexpected error occurred while creating the FAQ.");
    }
  };
  const onRegisterSuccess = () => {
    reset();
    toast.success("FAQ created successfully");
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          reset();
        }
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="bg-blue-700 text-white hover:bg-blue-500"
          >
            Add FAQ
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-white z-50 dark:bg-gray-800 dark:text-white/90">
          <DialogHeader>
            <DialogTitle>Add FAQ</DialogTitle>
            <DialogDescription>
              Add a new FAQ item with question and answer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Select FAQ category" />
                    </SelectTrigger>
                    <SelectContent>
                      {FAQ_CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && (
                <p className="text-sm text-red-500 dark:text-red-500/90">
                  {errors.category.message}
                </p>
              )}
            </div>
            <div className="grid gap-3">
              <Label htmlFor="question">
                Question <span className="text-red-500">*</span>
              </Label>
              <Input
                className="dark:bg-gray-900 dark:placeholder:text-white/30"
                id="question"
                placeholder="Enter FAQ question"
                autoComplete="off"
                {...register(
                  "question",
                  liveTextInputRegisterOptions(
                    "question",
                    setValue,
                    isSubmitted,
                  ),
                )}
              />
              {errors.question && (
                <p className="text-sm text-red-500 dark:text-red-500/90">
                  {errors.question.message}
                </p>
              )}
            </div>
            <div className="grid gap-3">
              <Label htmlFor="answer">
                Answer <span className="text-red-500">*</span>
              </Label>
              <TextArea
                id="answer"
                placeholder="Enter FAQ answer"
                rows={6}
                autoComplete="off"
                {...register(
                  "answer",
                  liveTextInputRegisterOptions("answer", setValue, isSubmitted),
                )}
              />
              {errors.answer && (
                <p className="text-sm text-red-500 dark:text-red-500/90">
                  {errors.answer.message}
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
