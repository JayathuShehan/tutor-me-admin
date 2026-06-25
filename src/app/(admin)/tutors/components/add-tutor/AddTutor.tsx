"use client";

import MultiSelect from "@/components/form/MultiSelect";
import MultiFileUploader from "@/components/MultiFileUploader";
import { Button } from "@/components/ui/button/Button";
import DatePicker from "@/components/ui/DatePicker";
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
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLASS_TYPE_OPTIONS,
  EDUCATION_OPTIONS_ADD,
  NOT_PREFERRED_LOCATION_VALUE,
  PREFERRED_LOCATION_OPTIONS,
  TUTOR_GENDER_VALUES,
  TUTOR_MEDIUM_OPTIONS,
  TUTOR_TYPE_OPTIONS,
  YEARS_EXPERIENCE_OPTIONS,
} from "@/configs/app-constants";
import {
  useFetchGradesQuery,
  useLazyFetchGradeByIdQuery,
} from "@/store/api/splits/grades";
import {
  useCreateTutorMutation,
  useLazyGetTutorEmailAvailabilityQuery,
} from "@/store/api/splits/tutors";
import { getErrorInApiResult } from "@/utils/api";
import {
  collapseTextSpaces,
  normalizeTextSpaces,
  removeWhitespace,
  stripLeadingSpaces,
} from "@/utils/form-normalizers";
import { sortBySchoolGradeOrder } from "@/utils/grade-filter-order";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, CircleX, Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Controller,
  FieldValues,
  Path,
  useForm,
  UseFormReturn,
  useWatch,
} from "react-hook-form";
import toast from "react-hot-toast";
import {
  AddTutorFormValues,
  addTutorSchema,
  initialTutorFormValues,
} from "./schema";

const getMinimumAdultBirthDate = () => {
  const today = new Date();
  return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
};

const EMAIL_CHECK_DELAY_MS = 500;
const DUPLICATE_EMAIL_MESSAGE = "Email already exists";
const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isOnlineOnlyClassTypes = (classTypes: string[] = []) =>
  classTypes.length > 0 &&
  classTypes.every((classType) => classType.toLowerCase().startsWith("online"));

const getUploadErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined;

  if (Array.isArray(error)) {
    for (const item of error) {
      const message = getUploadErrorMessage(item);
      if (message) return message;
    }

    return undefined;
  }

  const errorRecord = error as Record<string, unknown>;

  if (typeof errorRecord.message === "string") return errorRecord.message;

  for (const value of Object.values(errorRecord)) {
    const message = getUploadErrorMessage(value);
    if (message) return message;
  }

  return undefined;
};

const isDuplicateEmailError = (error: string) => {
  const normalizedError = error.toLowerCase();

  return (
    normalizedError.includes("email") &&
    (normalizedError.includes("already exists") ||
      normalizedError.includes("already in use") ||
      normalizedError.includes("already taken"))
  );
};

type EmailAvailabilityState = "available" | "unavailable" | null;

export function AddTutor() {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailAvailability, setEmailAvailability] =
    useState<EmailAvailabilityState>(null);
  const [createTutor, { isLoading }] = useCreateTutorMutation();
  const [checkTutorEmailAvailability, { isFetching: isCheckingEmail }] =
    useLazyGetTutorEmailAvailabilityQuery();
  const formId = "add-tutor-form";
  const maxTutorDateOfBirth = getMinimumAdultBirthDate();

  const form = useForm<AddTutorFormValues>({
    resolver: zodResolver(addTutorSchema),
    defaultValues: initialTutorFormValues,
    mode: "onChange",
  });

  const {
    clearErrors,
    control,
    formState,
    getValues,
    reset,
    setError,
    setFocus,
    setValue,
    trigger,
    watch,
  } = form;

  const selectedGrades = useWatch({
    control,
    name: "grades",
    defaultValue: [],
  }) as string[];

  const selectedSubjects = useWatch({
    control,
    name: "subjects",
    defaultValue: [],
  }) as string[];

  const selectedClassTypes = useWatch({
    control,
    name: "classType",
    defaultValue: [],
  }) as string[];

  const dob = useWatch({
    control,
    name: "dateOfBirth",
    defaultValue: "",
  }) as string;

  const email = useWatch({
    control,
    name: "email",
    defaultValue: "",
  }) as string;

  const password = useWatch({
    control,
    name: "password",
    defaultValue: "",
  }) as string;

  const confirmPassword = useWatch({
    control,
    name: "confirmPassword",
    defaultValue: "",
  }) as string;
  const confirmPasswordErrorType = (
    formState.errors.confirmPassword as { type?: string } | undefined
  )?.type;

  const { data: gradesData } = useFetchGradesQuery({ page: 1, limit: 100 });
  const [fetchGradeById] = useLazyFetchGradeByIdQuery();

  const gradeOptions = sortBySchoolGradeOrder(gradesData?.results || []).map(
    (g) => ({
      value: g.id,
      text: g.title,
    }),
  );

  const [subjectOptions, setSubjectOptions] = useState<
    { value: string; text: string }[]
  >([]);

  const prevUniqueSubjectsRef = useRef<string | null>(null);
  const latestEmailRef = useRef("");
  const selectedGradesJson = JSON.stringify(selectedGrades || []);
  const hasSelectedClassTypes = selectedClassTypes.length > 0;
  const isOnlineOnlyClassType = isOnlineOnlyClassTypes(selectedClassTypes);
  const isPreferredLocationsDisabled =
    !hasSelectedClassTypes || isOnlineOnlyClassType;
  const preferredLocationOptions = isOnlineOnlyClassType
    ? [
        {
          value: NOT_PREFERRED_LOCATION_VALUE,
          text: NOT_PREFERRED_LOCATION_VALUE,
        },
      ]
    : PREFERRED_LOCATION_OPTIONS;

  useEffect(() => {
    if (!hasSelectedClassTypes) {
      setValue("preferredLocations", [], {
        shouldDirty: false,
        shouldValidate: false,
      });
      clearErrors("preferredLocations");
      return;
    }

    if (isOnlineOnlyClassType) {
      setValue("preferredLocations", [NOT_PREFERRED_LOCATION_VALUE], {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors("preferredLocations");
      return;
    }

    if (
      getValues("preferredLocations").includes(NOT_PREFERRED_LOCATION_VALUE)
    ) {
      setValue("preferredLocations", [], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [
    clearErrors,
    getValues,
    hasSelectedClassTypes,
    isOnlineOnlyClassType,
    setValue,
  ]);

  useEffect(() => {
    const grades = JSON.parse(selectedGradesJson || "[]") as string[];

    if (grades.length === 0) {
      if (
        subjectOptions.length > 0 ||
        (selectedSubjects && selectedSubjects.length > 0)
      ) {
        setSubjectOptions([]);

        if (selectedSubjects && selectedSubjects.length > 0) {
          setValue("subjects", [], { shouldValidate: true });
        }
      }

      prevUniqueSubjectsRef.current = null;
      return;
    }

    let cancelled = false;

    const loadSubjects = async () => {
      const allSubjects: { id: string; title: string }[] = [];

      for (const gradeId of grades) {
        const res = await fetchGradeById(gradeId);

        if (res?.data?.subjects) {
          allSubjects.push(...res.data.subjects);
        }
      }

      const uniqueSubjects = Array.from(
        new Map(allSubjects.map((s) => [s.id, s])).values(),
      );

      const uniqueJson = JSON.stringify(
        uniqueSubjects.map((s) => ({ id: s.id, title: s.title })),
      );

      if (cancelled) return;

      if (prevUniqueSubjectsRef.current !== uniqueJson) {
        setSubjectOptions(
          uniqueSubjects.map((s) => ({ value: s.id, text: s.title })),
        );
        prevUniqueSubjectsRef.current = uniqueJson;
      }

      const validSelected = (selectedSubjects || []).filter((sId) =>
        uniqueSubjects.some((us) => us.id === sId),
      );

      if (validSelected.length !== (selectedSubjects || []).length) {
        setValue("subjects", validSelected, { shouldValidate: true });
      }
    };

    loadSubjects();

    return () => {
      cancelled = true;
    };
  }, [
    fetchGradeById,
    selectedGradesJson,
    selectedSubjects,
    setValue,
    subjectOptions.length,
  ]);

  useEffect(() => {
    if (!open) {
      reset(initialTutorFormValues);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setEmailAvailability(null);
    }
  }, [open, reset]);

  useEffect(() => {
    if (!password || !confirmPassword) {
      if (confirmPasswordErrorType === "passwordMismatch") {
        clearErrors("confirmPassword");
      }

      return;
    }

    if (password !== confirmPassword) {
      if (confirmPasswordErrorType !== "passwordMismatch") {
        setError("confirmPassword", {
          type: "passwordMismatch",
          message: "Passwords do not match",
        });
      }

      return;
    }

    if (confirmPasswordErrorType === "passwordMismatch") {
      clearErrors("confirmPassword");
    }
  }, [
    clearErrors,
    confirmPassword,
    confirmPasswordErrorType,
    password,
    setError,
  ]);

  const handleDialogOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen) {
      reset(initialTutorFormValues);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setEmailAvailability(null);
    }
  };

  useEffect(() => {
    const normalizedEmail =
      typeof email === "string" ? removeWhitespace(email).toLowerCase() : "";

    latestEmailRef.current = normalizedEmail;

    if (
      !open ||
      !normalizedEmail ||
      !EMAIL_FORMAT_PATTERN.test(normalizedEmail)
    ) {
      setEmailAvailability(null);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const result = await checkTutorEmailAvailability(normalizedEmail, true);

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
  }, [checkTutorEmailAvailability, clearErrors, email, open, setError]);

  useEffect(() => {
    if (!dob) return;

    const d = new Date(dob);
    if (isNaN(d.getTime())) return;

    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
      age--;
    }

    if (age < 0) age = 0;

    setValue("age", age, { shouldValidate: true });
    form.trigger("age");
  }, [dob, form, setValue]);

  const handleYearsSelect = (val: string) => {
    const parsed = val === "10+" ? 10 : parseInt(val || "0", 10);

    setValue("yearsExperience", parsed, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = async (data: AddTutorFormValues) => {
    const normalizedEmail = removeWhitespace(data.email).toLowerCase();
    setValue("email", normalizedEmail, { shouldValidate: true });

    const emailAvailabilityResult =
      await checkTutorEmailAvailability(normalizedEmail);

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

    const rest = { ...data };
    Reflect.deleteProperty(rest, "confirmPassword");

    const cleanedData = {
      ...rest,
      email: normalizedEmail,
      fullName: normalizeTextSpaces(data.fullName) as string,
      preferredLocations: isOnlineOnlyClassTypes(data.classType)
        ? [NOT_PREFERRED_LOCATION_VALUE]
        : data.preferredLocations,
    };

    const result = await createTutor(cleanedData);

    const error = getErrorInApiResult(result);

    if (error) {
      if (isDuplicateEmailError(error)) {
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

    if ("data" in result) {
      reset(initialTutorFormValues);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setEmailAvailability(null);
      toast.success("Tutor added successfully");
      setOpen(false);
    }
  };

  const fullNameRegister = form.register("fullName", {
    onChange: (event) => {
      const cleaned = stripLeadingSpaces(event.target.value);

      if (cleaned !== event.target.value) {
        event.target.value = cleaned;
        setValue("fullName", cleaned, {
          shouldValidate: formState.isSubmitted,
        });
      }
    },
    onBlur: (event) => {
      setValue("fullName", collapseTextSpaces(event.target.value), {
        shouldValidate: true,
      });
    },
  });

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
      const isServerEmailError =
        (formState.errors.email as { type?: string } | undefined)?.type ===
        "server";

      setValue("email", removeWhitespace(event.target.value).toLowerCase(), {
        shouldValidate: !isServerEmailError,
      });
    },
  });

  const passwordRegister = form.register("password", {
    onChange: (event) => {
      const cleaned = removeWhitespace(event.target.value);

      if (cleaned !== event.target.value) {
        event.target.value = cleaned;
        setValue("password", cleaned, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      if (getValues("confirmPassword")) {
        void trigger("confirmPassword");
      }
    },
    onBlur: (event) => {
      setValue("password", removeWhitespace(event.target.value), {
        shouldValidate: true,
      });

      if (getValues("confirmPassword")) {
        void trigger("confirmPassword");
      }
    },
  });

  const confirmPasswordRegister = form.register("confirmPassword", {
    onChange: (event) => {
      const cleaned = removeWhitespace(event.target.value);

      if (cleaned !== event.target.value) {
        event.target.value = cleaned;
        setValue("confirmPassword", cleaned, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
    onBlur: (event) => {
      setValue("confirmPassword", removeWhitespace(event.target.value), {
        shouldValidate: true,
      });
    },
  });

  const uploadErrorMessage = getUploadErrorMessage(
    formState.errors.certificatesAndQualifications,
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="bg-blue-700 text-white hover:bg-blue-500"
          >
            Add Tutor
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[700px] bg-white dark:bg-gray-800 dark:text-white/90 p-0 overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0">
          <DialogHeader className="shrink-0 bg-white dark:bg-gray-800 px-6 py-4 border-b">
            <DialogTitle>Add Tutor</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="e.g Nimal Perera"
                  {...fullNameRegister}
                />
                {formState.errors.fullName && (
                  <p className="text-sm text-red-500">
                    {formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number *</Label>
                <Controller
                  name="contactNumber"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="contactNumber"
                      type="tel"
                      placeholder="e.g 0712345678"
                      maxLength={10}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        field.onChange(digits);
                      }}
                    />
                  )}
                />
                {formState.errors.contactNumber && (
                  <p className="text-sm text-red-500">
                    {formState.errors.contactNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Min 8 chars, letter & number"
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
                  {formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      className="pr-10"
                      {...confirmPasswordRegister}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:text-gray-400 dark:hover:text-gray-200"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      aria-controls="confirmPassword"
                      aria-pressed={showConfirmPassword}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <DatePicker
                  id="dateOfBirth"
                  label="Date of Birth"
                  required
                  value={watch("dateOfBirth")}
                  onChange={(date) =>
                    setValue("dateOfBirth", date, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  placeholder="dd/mm/yyyy"
                  error={formState.errors.dateOfBirth?.message}
                  maxDate={maxTutorDateOfBirth}
                />

                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    {...form.register("age", { valueAsNumber: true })}
                    disabled
                  />
                  {formState.errors.age ? (
                    <p className="text-sm text-red-500">
                      {formState.errors.age.message}
                    </p>
                  ) : watch("dateOfBirth") && !formState.errors.dateOfBirth ? (
                    <p className="text-sm text-muted-foreground">
                      Calculated from your date of birth
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <SelectField
                  label="Gender *"
                  id="gender"
                  value={watch("gender")}
                  error={formState.errors.gender?.message}
                  onChange={(val) =>
                    setValue("gender", val as AddTutorFormValues["gender"], {
                      shouldValidate: true,
                    })
                  }
                  options={[...TUTOR_GENDER_VALUES]}
                  placeholder="Select your gender"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 z-62">
                <div className="space-y-2">
                  <MultiSelect
                    label="Tutor Type *"
                    options={TUTOR_TYPE_OPTIONS}
                    defaultSelected={watch("tutorType")}
                    onChange={(selected) =>
                      setValue(
                        "tutorType",
                        selected as AddTutorFormValues["tutorType"],
                        { shouldValidate: true },
                      )
                    }
                  />
                  {formState.errors.tutorType && (
                    <p className="text-sm text-red-500">
                      {formState.errors.tutorType.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <MultiSelect
                    label="Class Type *"
                    options={CLASS_TYPE_OPTIONS}
                    defaultSelected={watch("classType")}
                    onChange={(selected) =>
                      setValue(
                        "classType",
                        selected as AddTutorFormValues["classType"],
                        { shouldValidate: true },
                      )
                    }
                  />
                  {formState.errors.classType && (
                    <p className="text-sm text-red-500">
                      {formState.errors.classType.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <MultiSelect
                  label="Tutor Mediums *"
                  options={TUTOR_MEDIUM_OPTIONS}
                  defaultSelected={watch("tutorMediums")}
                  onChange={(selected) =>
                    setValue(
                      "tutorMediums",
                      selected as AddTutorFormValues["tutorMediums"],
                      { shouldValidate: true },
                    )
                  }
                />
                {formState.errors.tutorMediums && (
                  <p className="text-sm text-red-500">
                    {formState.errors.tutorMediums.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <MultiSelect
                  label="Grades *"
                  options={gradeOptions}
                  defaultSelected={watch("grades")}
                  onChange={(selected) =>
                    setValue(
                      "grades",
                      selected as AddTutorFormValues["grades"],
                      { shouldValidate: true },
                    )
                  }
                />
                {formState.errors.grades && (
                  <p className="text-sm text-red-500">
                    {formState.errors.grades.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <MultiSelect
                  label="Subjects *"
                  options={subjectOptions}
                  defaultSelected={watch("subjects")}
                  onChange={(selected) =>
                    setValue(
                      "subjects",
                      selected as AddTutorFormValues["subjects"],
                      { shouldValidate: true },
                    )
                  }
                  disabled={!selectedGrades || selectedGrades.length === 0}
                />
                {formState.errors.subjects && (
                  <p className="text-sm text-red-500">
                    {formState.errors.subjects.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <MultiSelect
                  label="Preferred Locations *"
                  options={preferredLocationOptions}
                  defaultSelected={watch("preferredLocations")}
                  onChange={(selected) =>
                    setValue(
                      "preferredLocations",
                      selected as AddTutorFormValues["preferredLocations"],
                      { shouldValidate: true },
                    )
                  }
                  disabled={isPreferredLocationsDisabled}
                  searchable
                />
                {!isPreferredLocationsDisabled &&
                  (formState.isSubmitted ||
                    formState.touchedFields.preferredLocations) &&
                  formState.errors.preferredLocations && (
                    <p className="text-sm text-red-500">
                      {formState.errors.preferredLocations.message}
                    </p>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="yearsExperience">Years of Experience *</Label>
                  <Select
                    onValueChange={handleYearsSelect}
                    value={String(watch("yearsExperience"))}
                  >
                    <SelectTrigger id="yearsExperience">
                      <SelectValue placeholder="Select years" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS_EXPERIENCE_OPTIONS.map((opt) => (
                        <SelectItem
                          key={String(opt.value)}
                          value={String(opt.value)}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formState.errors.yearsExperience && (
                    <p className="text-sm text-red-500">
                      {formState.errors.yearsExperience.message}
                    </p>
                  )}
                </div>

                <SelectField
                  label="Highest Education *"
                  id="highestEducation"
                  value={watch("highestEducation")}
                  error={formState.errors.highestEducation?.message}
                  onChange={(val) =>
                    setValue(
                      "highestEducation",
                      val as AddTutorFormValues["highestEducation"],
                      { shouldValidate: true },
                    )
                  }
                  options={[...EDUCATION_OPTIONS_ADD]}
                  placeholder="Select highest education"
                />
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <Label>Document Upload *</Label>
                <MultiFileUploader
                  mode="certificate"
                  onUploaded={(items) =>
                    setValue("certificatesAndQualifications", items, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                {formState.isSubmitted && uploadErrorMessage && (
                  <p className="text-sm text-red-500">{uploadErrorMessage}</p>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <CheckboxField<AddTutorFormValues>
                  label="I agree to Terms & Conditions *"
                  id="agreeTerms"
                  form={form}
                />

                <CheckboxField<AddTutorFormValues>
                  label="I agree to receive assignment info *"
                  id="agreeAssignmentInfo"
                  form={form}
                />
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
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

function SelectField({
  label,
  id,
  value,
  error,
  onChange,
  options,
  placeholder = "Select option",
}: {
  label: string;
  id: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  options: string[] | { value: string; text: string }[];
  placeholder?: string;
}) {
  const normalised = (
    options as (string | { value: string; text: string })[]
  ).map((o) => (typeof o === "string" ? { value: o, text: o } : o));
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {normalised.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function CheckboxField<T extends FieldValues>({
  label,
  id,
  form,
}: {
  label: string;
  id: Path<T>;
  form: UseFormReturn<T>;
}) {
  const { formState } = form;

  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-2">
        <input type="checkbox" {...form.register(id)} />
        <span>{label}</span>
      </Label>

      {formState.errors[id] && (
        <p className="text-sm text-red-500">
          {
            (formState.errors as Record<string, { message?: string }>)[id]
              ?.message
          }
        </p>
      )}
    </div>
  );
}
