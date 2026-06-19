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
import { useCreateInquiryMutation } from "@/store/api/splits/inquiries";
import { getErrorInApiResult } from "@/utils/api";
import {
  alphabeticTextInputRegisterOptions,
  liveTextInputRegisterOptions,
  noWhitespaceInputRegisterOptions,
} from "@/utils/form-normalizers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import TextArea from "@/components/form/input/TextArea";
import {
  CreateInquirySchema,
  createInquirySchema,
  initialInquiryFormValues,
} from "./schema";

export function AddInquiry() {
  const [open, setOpen] = useState(false);
  const inquiryForm = useForm<CreateInquirySchema>({
    resolver: zodResolver(createInquirySchema),
    defaultValues: initialInquiryFormValues as CreateInquirySchema,
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitted },
  } = inquiryForm;

  const [createInquiry, { isLoading }] = useCreateInquiryMutation();

  const onSubmit = async (data: CreateInquirySchema) => {
    const payload = {
      sender: {
        name: data.senderName,
        email: data.senderEmail,
      },
      message: data.message,
    };

    const result = await createInquiry(payload);
    const error = getErrorInApiResult(result);
    if (error) return toast.error(error);

    if ("data" in result) onRegisterSuccess();
  };

  const onRegisterSuccess = () => {
    reset();
    toast.success("Inquiry created successfully");
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-blue-700 text-white hover:bg-blue-500"
        >
          Add Inquiry
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-white z-50 dark:bg-gray-800 dark:text-white/90 p-0 overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <DialogHeader className="shrink-0 px-6 py-4 border-b bg-white dark:bg-gray-800">
            <DialogTitle>Add Inquiry (Manually)</DialogTitle>
            <DialogDescription>
              Add a new inquiry with sender name, email, and inquiry.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-6 py-4 grid gap-4">
            {/* Sender Name */}
            <div className="grid gap-3">
              <Label htmlFor="senderName">
                Sender Name <span className="text-red-500">*</span>
              </Label>
              <Input
                className="dark:bg-gray-900 dark:placeholder:text-white/30"
                id="senderName"
                placeholder="Enter sender name"
                autoComplete="off"
                {...register(
                  "senderName",
                  alphabeticTextInputRegisterOptions(
                    "senderName",
                    setValue,
                    isSubmitted,
                  ),
                )}
              />
              {errors.senderName && (
                <p className="text-sm text-red-500 dark:text-red-500/90">
                  {errors.senderName.message}
                </p>
              )}
            </div>

            {/* Sender Email */}
            <div className="grid gap-3">
              <Label htmlFor="senderEmail">
                Sender Email <span className="text-red-500">*</span>
              </Label>
              <Input
                className="dark:bg-gray-900 dark:placeholder:text-white/30"
                id="senderEmail"
                placeholder="Enter sender email"
                autoComplete="off"
                {...register(
                  "senderEmail",
                  noWhitespaceInputRegisterOptions(
                    "senderEmail",
                    setValue,
                    isSubmitted,
                    true,
                  ),
                )}
              />
              {errors.senderEmail && (
                <p className="text-sm text-red-500 dark:text-red-500/90">
                  {errors.senderEmail.message}
                </p>
              )}
            </div>

            {/* Inquiry Message */}
            <div className="grid gap-3">
              <Label htmlFor="message">
                Inquiry <span className="text-red-500">*</span>
              </Label>
              <TextArea
                className="dark:bg-gray-900 dark:placeholder:text-white/30"
                id="message"
                placeholder="Enter inquiry"
                rows={6}
                autoComplete="off"
                {...register(
                  "message",
                  liveTextInputRegisterOptions(
                    "message",
                    setValue,
                    isSubmitted,
                  ),
                )}
              />
              {errors.message && (
                <p className="text-sm text-red-500 dark:text-red-500/90">
                  {errors.message.message}
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
            >
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
