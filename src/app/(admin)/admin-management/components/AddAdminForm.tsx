"use client";

import { Button } from "@/components/ui/button/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCreateAdminMutation } from "@/store/api/splits/admins";
import { useLazyFetchUsersQuery } from "@/store/api/splits/users";
import { getErrorInApiResult } from "@/utils/api";
import {
  collapseTextSpaces,
  removeWhitespace,
  stripLeadingSpaces,
} from "@/utils/form-normalizers";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  CircleCheck,
  CircleX,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import {
  createAdminSchema,
  CreateAdminSchema,
  initialAdminValues,
} from "./admin-schema";

const workflowSteps = [
  "Create the admin account with name, email, phone number, and password.",
  "Backend creates the admin with role: admin.",
  "New admin opens the link, sets a new password, and then logs in normally.",
];

const preventWhitespaceKey = (event: KeyboardEvent<HTMLInputElement>) => {
  if (/\s/.test(event.key)) {
    event.preventDefault();
  }
};

const EMAIL_CHECK_DELAY_MS = 500;
const DUPLICATE_EMAIL_MESSAGE = "Email already exists";
const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailAvailabilityState = "available" | "unavailable" | null;

const hasExistingEmail = (
  users: Array<{ email?: string }> | undefined,
  email: string,
) => Boolean(users?.some((user) => user.email?.trim().toLowerCase() === email));

const isDuplicateEmailError = (error: string) => {
  const normalizedError = error.toLowerCase();

  return (
    normalizedError.includes("email") &&
    (normalizedError.includes("already exists") ||
      normalizedError.includes("already in use") ||
      normalizedError.includes("already taken"))
  );
};

export default function AddAdminForm() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailAvailability, setEmailAvailability] =
    useState<EmailAvailabilityState>(null);
  const [createAdmin, { isLoading }] = useCreateAdminMutation();
  const [fetchUsersByEmail, { isFetching: isCheckingEmail }] =
    useLazyFetchUsersQuery();
  const latestEmailRef = useRef("");

  const form = useForm<CreateAdminSchema>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: initialAdminValues,
    mode: "onChange",
  });

  const {
    formState: { errors },
    clearErrors,
    reset,
    setError,
    setFocus,
    setValue,
  } = form;
  const email = useWatch({
    control: form.control,
    name: "email",
    defaultValue: "",
  });

  useEffect(() => {
    const normalizedEmail =
      typeof email === "string" ? removeWhitespace(email).toLowerCase() : "";

    latestEmailRef.current = normalizedEmail;

    if (!normalizedEmail || !EMAIL_FORMAT_PATTERN.test(normalizedEmail)) {
      setEmailAvailability(null);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const result = await fetchUsersByEmail(
        {
          search: normalizedEmail,
          page: 1,
          limit: 100,
        },
        true,
      );

      if (latestEmailRef.current !== normalizedEmail) return;

      if (!result.data) {
        setEmailAvailability(null);
        return;
      }

      const emailExists = hasExistingEmail(
        result.data?.results,
        normalizedEmail,
      );

      if (emailExists) {
        setEmailAvailability("unavailable");
        setError("email", {
          type: "server",
          message: DUPLICATE_EMAIL_MESSAGE,
        });
        return;
      }

      setEmailAvailability("available");
      if (errors.email?.type === "server") {
        clearErrors("email");
      }
    }, EMAIL_CHECK_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [clearErrors, email, errors.email?.type, fetchUsersByEmail, setError]);

  const onSubmit = async (values: CreateAdminSchema) => {
    const cleanedValues: CreateAdminSchema = {
      name: collapseTextSpaces(values.name),
      email: removeWhitespace(values.email).toLowerCase(),
      phoneNumber: values.phoneNumber.trim(),
      password: values.password.trim(),
    };

    const emailResult = await fetchUsersByEmail({
      search: cleanedValues.email,
      page: 1,
      limit: 100,
    });
    const emailExists = hasExistingEmail(
      emailResult.data?.results,
      cleanedValues.email,
    );

    if (emailExists) {
      setEmailAvailability("unavailable");
      setError("email", {
        type: "server",
        message: DUPLICATE_EMAIL_MESSAGE,
      });
      setFocus("email");
      return;
    }

    const result = await createAdmin(cleanedValues);
    const error = getErrorInApiResult(result);

    if (error) {
      if (isDuplicateEmailError(error)) {
        setEmailAvailability("unavailable");
        setError("email", {
          type: "server",
          message: DUPLICATE_EMAIL_MESSAGE,
        });
        setFocus("email");
        return;
      }

      toast.error(error);
      return;
    }

    setInviteEmail(cleanedValues.email);
    toast.success("Admin created successfully");
    reset(initialAdminValues);
    setShowPassword(false);
    setEmailAvailability(null);
  };

  const nameRegister = form.register("name", {
    onChange: (event) => {
      const cleaned = stripLeadingSpaces(event.target.value);

      if (cleaned !== event.target.value) {
        event.target.value = cleaned;
        setValue("name", cleaned, {
          shouldValidate: form.formState.isSubmitted,
        });
      }
    },
    onBlur: (event) => {
      setValue("name", collapseTextSpaces(event.target.value), {
        shouldValidate: true,
      });
    },
  });

  const emailRegister = form.register("email", {
    onChange: (event) => {
      const cleaned = removeWhitespace(event.target.value);

      if (cleaned !== event.target.value) {
        event.target.value = cleaned;
        setValue("email", cleaned, {
          shouldValidate: form.formState.isSubmitted,
        });
      }
    },
    onBlur: (event) => {
      setValue("email", removeWhitespace(event.target.value), {
        shouldValidate: true,
      });
    },
  });

  const phoneNumberRegister = form.register("phoneNumber", {
    onChange: (event) => {
      const cleaned = event.target.value.replace(/\D/g, "").slice(0, 10);

      if (cleaned !== event.target.value) {
        event.target.value = cleaned;
        setValue("phoneNumber", cleaned, {
          shouldValidate: form.formState.isSubmitted,
        });
      }
    },
    onBlur: (event) => {
      setValue(
        "phoneNumber",
        event.target.value.replace(/\D/g, "").slice(0, 10),
        {
          shouldValidate: true,
        },
      );
    },
  });

  const passwordRegister = form.register("password", {
    onChange: (event) => {
      const cleaned = removeWhitespace(event.target.value);

      if (cleaned !== event.target.value) {
        event.target.value = cleaned;
        setValue("password", cleaned, {
          shouldValidate: form.formState.isSubmitted,
        });
      }
    },
    onBlur: (event) => {
      setValue("password", removeWhitespace(event.target.value), {
        shouldValidate: true,
      });
    },
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
      <Card className="border-gray-200/80 bg-white/95  dark:border-gray-800 dark:bg-gray-900">
        <CardHeader className="border-b border-gray-100  dark:border-gray-800 dark:from-blue-500/10 dark:via-gray-900 dark:to-cyan-500/10">
          <CardTitle className="flex items-center gap-3 text-2xl text-gray-900 dark:text-white">
            Create Admin Account
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Add a new admin, trigger the reset-password email, and guide them
            through the first login flow after they set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Admin Name <span className="text-red-500">*</span>
                </label>
                <Input id="name" {...nameRegister} />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    onKeyDown={preventWhitespaceKey}
                    className={`pr-10 ${
                      errors.email || emailAvailability === "unavailable"
                        ? "border-red-500"
                        : ""
                    }`}
                    {...emailRegister}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                    {isCheckingEmail ? (
                      <Spinner className="text-gray-400" />
                    ) : errors.email || emailAvailability === "unavailable" ? (
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
                {errors.email ? (
                  <p className="min-h-4 text-sm leading-4 text-red-500">
                    {errors.email.message}
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
                  <p className="min-h-4 text-sm leading-4 text-gray-500">
                    Enter a valid email address
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="phoneNumber"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  {...phoneNumberRegister}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-red-500">
                    {errors.phoneNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    onKeyDown={preventWhitespaceKey}
                    className="pr-10"
                    {...passwordRegister}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-controls="password"
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This value is submitted with the create request. The admin
                  will still reset their password from the email link before
                  logging in.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
              After creation, the backend sends a reset-password email with a
              token link. The new admin must set a fresh password before their
              first login.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="submit"
                className="bg-blue-700 text-white hover:bg-blue-600"
                isLoading={isLoading}
                disabled={isLoading || isCheckingEmail}
              >
                Create Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset(initialAdminValues);
                  setShowPassword(false);
                  setEmailAvailability(null);
                }}
              >
                Clear Form
              </Button>
            </div>
          </form>

          {inviteEmail && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Reset email sent</p>
                  <p className="text-sm">
                    A reset-password email has been queued for{" "}
                    <span className="font-medium">{inviteEmail}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-gray-200/80 bg-white shadow-[0_18px_80px_-30px_rgba(37,99,235,0.18)] dark:border-gray-800 dark:bg-gray-900">
          <CardHeader className="border-b border-gray-100  dark:border-gray-800 dark:from-blue-500/10 dark:via-gray-900 dark:to-sky-500/10">
            <CardTitle className="flex items-center gap-3 text-xl text-gray-900 dark:text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </span>
              Admin Invite Flow
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              This page covers the full admin onboarding flow from creation to
              password reset and login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {workflowSteps.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">
                  {step}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
