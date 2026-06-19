"use client";

import FileUploadDropzone from "@/components/fileUploader";
import { Button } from "@/components/ui/button/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
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
import { Spinner } from "@/components/ui/spinner";
import {
  useLazyGetRefereeEmailAvailabilityQuery,
  useUpdateRefereeMutation,
} from "@/store/api/splits/referees";
import { Referee } from "@/types/response-types";
import { getErrorInApiResult } from "@/utils/api";
import {
  normalizeTextSpaces,
  removeWhitespace,
  singleSpaceTextInputRegisterOptions,
} from "@/utils/form-normalizers";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, CircleX, SquarePen } from "lucide-react";
import NextImage from "next/image";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { AddRefereeFormValues, addRefereeSchema } from "./schema";

const EMAIL_CHECK_DELAY_MS = 500;
const DUPLICATE_EMAIL_MESSAGE = "Email already exists";
const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailAvailabilityState = "available" | "unavailable" | null;

export function EditReferee({ referee }: { referee: Referee }) {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    referee.avatar || null,
  );
  const [emailAvailability, setEmailAvailability] =
    useState<EmailAvailabilityState>(null);
  const formId = `edit-referee-form-${referee.id}`;

  const [updateReferee, { isLoading }] = useUpdateRefereeMutation();
  const [checkRefereeEmailAvailability, { isFetching: isCheckingEmail }] =
    useLazyGetRefereeEmailAvailabilityQuery();

  const initialValues: AddRefereeFormValues = {
    name: referee.name,
    email: referee.email,
    contactNumber: referee.contactNumber,
    gender: referee.gender as AddRefereeFormValues["gender"],
    avatar: referee.avatar || "",
  };

  const form = useForm<AddRefereeFormValues>({
    resolver: zodResolver(addRefereeSchema),
    defaultValues: initialValues,
    mode: "onChange",
  });

  const { formState, setValue, setError, clearErrors, setFocus, reset, watch } =
    form;

  const email = form.watch("email");
  const latestEmailRef = useRef("");
  const originalEmail = referee.email.toLowerCase();

  const resetState = () => {
    reset(initialValues);
    setPreviewUrl(referee.avatar || null);
    setEmailAvailability(null);
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetState();
  };

  useEffect(() => {
    const normalizedEmail =
      typeof email === "string" ? removeWhitespace(email).toLowerCase() : "";

    latestEmailRef.current = normalizedEmail;

    if (
      !open ||
      !normalizedEmail ||
      !EMAIL_FORMAT_PATTERN.test(normalizedEmail) ||
      normalizedEmail === originalEmail
    ) {
      setEmailAvailability(null);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const result = await checkRefereeEmailAvailability(normalizedEmail, true);

      if (latestEmailRef.current !== normalizedEmail) return;
      if (!result.data) return;

      if (!result.data.available) {
        setEmailAvailability("unavailable");
        setError("email", {
          type: "server",
          message: result.data.message || DUPLICATE_EMAIL_MESSAGE,
        });
        return;
      }

      setEmailAvailability("available");
      clearErrors("email");
    }, EMAIL_CHECK_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    checkRefereeEmailAvailability,
    clearErrors,
    email,
    open,
    originalEmail,
    setError,
  ]);

  const emailRegister = form.register("email", {
    onChange: (event) => {
      const cleaned = removeWhitespace(event.target.value);
      setEmailAvailability(null);

      if (
        (formState.errors.email as { type?: string } | undefined)?.type ===
        "server"
      ) {
        clearErrors("email");
      }

      if (cleaned !== event.target.value) {
        event.target.value = cleaned;
        setValue("email", cleaned, { shouldValidate: formState.isSubmitted });
      }
    },
    onBlur: (event) => {
      setValue("email", removeWhitespace(event.target.value).toLowerCase(), {
        shouldValidate: true,
      });
    },
  });

  const onSubmit = async (data: AddRefereeFormValues) => {
    const normalizedEmail = removeWhitespace(data.email).toLowerCase();
    setValue("email", normalizedEmail, { shouldValidate: true });

    if (normalizedEmail !== originalEmail) {
      const emailAvailabilityResult =
        await checkRefereeEmailAvailability(normalizedEmail);

      if (
        emailAvailabilityResult.data &&
        !emailAvailabilityResult.data.available
      ) {
        setEmailAvailability("unavailable");
        setError("email", {
          type: "server",
          message:
            emailAvailabilityResult.data.message || DUPLICATE_EMAIL_MESSAGE,
        });
        setFocus("email");
        return;
      }
    }

    const result = await updateReferee({
      id: referee.id,
      name: normalizeTextSpaces(data.name) as string,
      email: normalizedEmail,
      contactNumber: data.contactNumber,
      gender: data.gender,
      avatar: data.avatar || undefined,
    });

    const error = getErrorInApiResult(result);

    if (error) {
      toast.error(error);
      return;
    }

    if ("data" in result) {
      toast.success("Referee updated successfully");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
        <DialogTrigger asChild>
          <button
            type="button"
            title="Edit referee"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
          >
            <SquarePen className="h-4 w-4" />
          </button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800 dark:text-white/90 p-0 overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0">
          <DialogHeader className="shrink-0 bg-white dark:bg-gray-800 px-6 py-4 border-b">
            <DialogTitle>Edit Referee</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g Nimal Perera"
                  {...form.register(
                    "name",
                    singleSpaceTextInputRegisterOptions<AddRefereeFormValues>(
                      "name",
                      setValue,
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

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="text"
                    inputMode="email"
                    placeholder="e.g johndoe@gmail.com"
                    autoComplete="email"
                    className={`pr-10 ${
                      formState.errors.email ||
                      emailAvailability === "unavailable"
                        ? "border-red-500"
                        : ""
                    }`}
                    {...emailRegister}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                    {isCheckingEmail ? (
                      <Spinner className="text-gray-400" />
                    ) : formState.errors.email ||
                      emailAvailability === "unavailable" ? (
                      <CircleX
                        className="h-4 w-4 text-red-500"
                        aria-hidden="true"
                      />
                    ) : emailAvailability === "available" ? (
                      <CircleCheck
                        className="h-4 w-4 text-green-600"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                </div>
                {formState.errors.email ? (
                  <p className="min-h-4 text-sm leading-4 text-red-500">
                    {formState.errors.email.message}
                  </p>
                ) : emailAvailability === "unavailable" ? (
                  <p className="min-h-4 text-sm leading-4 text-red-500">
                    {DUPLICATE_EMAIL_MESSAGE}
                  </p>
                ) : isCheckingEmail ? (
                  <p className="min-h-4 text-sm leading-4 text-gray-500">
                    Checking email availability...
                  </p>
                ) : emailAvailability === "available" ? (
                  <p className="min-h-4 text-sm leading-4 text-green-600">
                    Email is available
                  </p>
                ) : (
                  <p className="min-h-4 text-sm leading-4 text-muted-foreground">
                    Enter a valid email address
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number *</Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  placeholder="e.g 0712345678"
                  maxLength={10}
                  value={watch("contactNumber") ?? ""}
                  onChange={(e) => {
                    const digits = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);
                    setValue("contactNumber", digits, { shouldValidate: true });
                  }}
                />
                {formState.errors.contactNumber && (
                  <p className="text-sm text-red-500">
                    {formState.errors.contactNumber.message}
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={watch("gender")}
                  onValueChange={(val) =>
                    setValue("gender", val as AddRefereeFormValues["gender"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger
                    id="gender"
                    aria-invalid={!!formState.errors.gender}
                  >
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {formState.errors.gender && (
                  <p className="text-sm text-red-500">
                    {formState.errors.gender.message}
                  </p>
                )}
              </div>

              <div className="grid min-w-0 gap-3">
                <Label htmlFor="avatar">Profile Photo (Optional)</Label>
                <div className="min-w-0 max-w-full overflow-hidden">
                  <FileUploadDropzone
                    imageOnly
                    onUploaded={(url) => {
                      setValue("avatar", url, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      setPreviewUrl(url || null);
                    }}
                  />
                </div>
                {previewUrl && (
                  <NextImage
                    src={previewUrl}
                    alt="Avatar Preview"
                    width={96}
                    height={96}
                    className="mt-2 h-24 w-24 object-cover rounded-full mx-auto"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral Code</Label>
                <Input
                  id="referralCode"
                  value={referee.referralCode}
                  disabled
                  className="font-mono tracking-wider"
                />
                <p className="text-xs text-muted-foreground">
                  Referral code cannot be edited.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 bg-white dark:bg-gray-800 px-6 py-4 border-t">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>

            <Button
              form={formId}
              type="submit"
              className="bg-blue-700 text-white hover:bg-blue-500"
              isLoading={isLoading}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
