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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CLASS_TYPE_OPTIONS,
  CLASS_TYPE_VALUES,
  EDUCATION_VALUES_EDIT,
  NATIONALITY_VALUES,
  NOT_PREFERRED_LOCATION_VALUE,
  PREFERRED_LOCATION_OPTIONS,
  PREFERRED_LOCATION_VALUES,
  RACE_VALUES,
  TUTOR_GENDER_VALUES,
  TUTOR_MEDIUM_OPTIONS,
  TUTOR_STATUS_OPTIONS,
  TUTOR_STATUS_VALUES,
  TUTOR_TYPE_OPTIONS,
  TUTOR_TYPE_VALUES,
  YEARS_EXPERIENCE_OPTIONS,
  type EducationEditValue,
} from "@/configs/app-constants";
import {
  useFetchGradesQuery,
  useLazyFetchGradeByIdQuery,
} from "@/store/api/splits/grades";
import {
  useFetchTutorByIdQuery,
  useUpdateTutorMutation,
} from "@/store/api/splits/tutors";
import { getErrorInApiResult } from "@/utils/api";
import {
  collapseTextSpaces,
  normalizeTextSpaces,
  stripLeadingSpaces,
} from "@/utils/form-normalizers";
import { sortBySchoolGradeOrder } from "@/utils/grade-filter-order";
import { zodResolver } from "@hookform/resolvers/zod";
import { SquarePen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { UpdateTutorSchema, updateTutorSchema } from "./schema";

interface EditTutorProps {
  id: string;
}

const LEGACY_EDUCATION_VALUE_MAP: Partial<Record<string, EducationEditValue>> =
  {
    Masters: "Masters Degree",
    "Master's Degree": "Masters Degree",
    AL: "Advanced Level (A/L)",
    "A/L": "Advanced Level (A/L)",
    "Advanced Level": "Advanced Level (A/L)",
    "JC/A Levels": "Advanced Level (A/L)",
    Diploma: "Diploma and Professional",
    Poly: "Diploma and Professional",
  };

const EMAIL_IMMUTABLE_MESSAGE =
  "Email cannot be modified after tutor creation.";

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

const getMinimumAdultBirthDate = () => {
  const today = new Date();
  return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
};

export function EditTutor({ id }: EditTutorProps) {
  const [open, setOpen] = useState(false);
  const formId = `edit-tutor-form-${id}`;
  const maxTutorDateOfBirth = getMinimumAdultBirthDate();
  const { data: tutorData, isLoading: isFetching } = useFetchTutorByIdQuery(id);
  const [updateTutor, { isLoading: isUpdating }] = useUpdateTutorMutation();

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

  const form = useForm<UpdateTutorSchema>({
    resolver: zodResolver(updateTutorSchema),
    defaultValues: {
      fullName: "",
      contactNumber: "",
      email: "",
      dateOfBirth: "",
      gender: "Male",
      age: 18,
      tutorMediums: [],
      grades: [],
      subjects: [],
      nationality: "Sri Lankan",
      race: "Sinhalese",
      status: "pending",
      classType: [],
      preferredLocations: [],
      tutorType: [],
      yearsExperience: 0,
      highestEducation: "Undergraduate",
      academicDetails: "",
      teachingSummary: "",
      studentResults: "",
      sellingPoints: "",
      certificatesAndQualifications: [],
    },
    mode: "onChange",
  });

  const {
    clearErrors,
    formState,
    getValues,
    reset,
    setValue,
    watch,
    control,
    handleSubmit,
  } = form;

  const selectedGrades = useWatch({
    control,
    name: "grades",
    defaultValue: [] as string[],
  }) as string[];

  const selectedSubjects = useWatch({
    control,
    name: "subjects",
    defaultValue: [] as string[],
  }) as string[];

  const selectedClassTypes = useWatch({
    control,
    name: "classType",
    defaultValue: [] as string[],
  }) as string[];

  const dob = useWatch({
    control,
    name: "dateOfBirth",
    defaultValue: "",
  }) as string;

  const safeEnumValue = <T extends string>(
    value: string | undefined,
    enumValues: readonly T[],
    fallback: T,
  ): T => {
    if (!value) return fallback;
    return enumValues.includes(value as T) ? (value as T) : fallback;
  };

  const normalizeHighestEducation = (
    value: string | undefined,
  ): EducationEditValue => {
    const normalizedValue = value
      ? (LEGACY_EDUCATION_VALUE_MAP[value] ?? value)
      : value;

    return safeEnumValue(
      normalizedValue,
      EDUCATION_VALUES_EDIT,
      "Undergraduate",
    );
  };

  const formatDateForForm = (isoDate: string | undefined): string => {
    if (!isoDate) return "";

    try {
      const date = new Date(isoDate);
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const safeArrayEnumValue = <T extends string>(
    values: string[] | undefined,
    enumValues: readonly T[],
  ): T[] => {
    if (!values) return [];
    return values.filter((value) => enumValues.includes(value as T)) as T[];
  };

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
        shouldDirty: true,
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
      (getValues("preferredLocations") || []).includes(
        NOT_PREFERRED_LOCATION_VALUE,
      )
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
        try {
          const res = await fetchGradeById(gradeId);

          if (res?.data?.subjects) {
            allSubjects.push(...res.data.subjects);
          }
        } catch (err) {
          console.error(err);
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

      const validSelected = (selectedSubjects || []).filter((sId: string) =>
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
    setValue,
    selectedSubjects,
    subjectOptions.length,
  ]);

  const buildResetValues = (data: typeof tutorData) => {
    if (!data) return {};

    return {
      fullName: normalizeTextSpaces(data.fullName || "") as string,
      contactNumber: data.contactNumber || "",
      email: data.email || "",
      dateOfBirth: formatDateForForm(data.dateOfBirth),
      gender: safeEnumValue(data.gender, TUTOR_GENDER_VALUES, "Male"),
      age: data.age || 18,
      tutorMediums: data.tutorMediums || [],
      grades: data.grades || [],
      subjects: data.subjects || [],
      nationality: safeEnumValue(
        data.nationality,
        NATIONALITY_VALUES,
        "Sri Lankan",
      ),
      race: safeEnumValue(data.race, RACE_VALUES, "Sinhalese"),
      status: safeEnumValue(data.status, TUTOR_STATUS_VALUES, "pending"),
      classType: safeArrayEnumValue(data.classType, CLASS_TYPE_VALUES),
      preferredLocations: safeArrayEnumValue(
        data.preferredLocations,
        PREFERRED_LOCATION_VALUES,
      ),
      tutorType: safeArrayEnumValue(
        data.tutorType,
        TUTOR_TYPE_VALUES,
      ) as UpdateTutorSchema["tutorType"],
      yearsExperience: data.yearsExperience || 0,
      highestEducation: normalizeHighestEducation(data.highestEducation),
      academicDetails: normalizeTextSpaces(
        data.academicDetails || "",
      ) as string,
      teachingSummary: normalizeTextSpaces(
        data.teachingSummary || "",
      ) as string,
      studentResults: normalizeTextSpaces(data.studentResults || "") as string,
      sellingPoints: normalizeTextSpaces(data.sellingPoints || "") as string,
      agreeTerms:
        typeof data.agreeTerms === "boolean" ? data.agreeTerms : undefined,
      agreeAssignmentInfo:
        typeof data.agreeAssignmentInfo === "boolean"
          ? data.agreeAssignmentInfo
          : undefined,
      certificatesAndQualifications: data.certificatesAndQualifications || [],
    };
  };

  useEffect(() => {
    if (tutorData && open) {
      reset(buildResetValues(tutorData));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorData, open, reset]);

  const handleDialogOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen && tutorData) {
      reset(buildResetValues(tutorData));
    }
  };

  useEffect(() => {
    if (!dob) return;

    const dateOfBirth = new Date(dob);
    if (isNaN(dateOfBirth.getTime())) return;

    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDifference = today.getMonth() - dateOfBirth.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < dateOfBirth.getDate())
    ) {
      age--;
    }

    setValue("age", Math.max(age, 0), {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.trigger("age");
  }, [dob, form, setValue]);

  const handleYearsSelect = (val: string) => {
    const parsed = val === "10+" ? 10 : parseInt(val || "0", 10);

    setValue("yearsExperience", parsed, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = async (data: UpdateTutorSchema) => {
    try {
      const { email: immutableEmail, ...editableData } = data;
      const cleanedData: Omit<UpdateTutorSchema, "email"> = {
        ...editableData,
        preferredLocations: isOnlineOnlyClassTypes(data.classType || [])
          ? [NOT_PREFERRED_LOCATION_VALUE]
          : data.preferredLocations,
        academicDetails: normalizeTextSpaces(
          data.academicDetails || "",
        ) as string,
        teachingSummary: normalizeTextSpaces(
          data.teachingSummary || "",
        ) as string,
        studentResults: normalizeTextSpaces(
          data.studentResults || "",
        ) as string,
        sellingPoints: normalizeTextSpaces(data.sellingPoints || "") as string,
      };

      const result = await updateTutor({ id, ...cleanedData });
      const error = getErrorInApiResult(result);

      if (error) {
        toast.error(error);
        return;
      }

      if ("data" in result) {
        reset({
          ...cleanedData,
          email: tutorData?.email || immutableEmail || "",
        });
        toast.success("Tutor updated successfully");
        setOpen(false);
      }
    } catch (error) {
      console.error("Unexpected error during tutor update:", error);
      toast.error("An unexpected error occurred while updating the tutor");
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

  const academicDetailsRegister = form.register("academicDetails", {
    onBlur: (event) => {
      setValue("academicDetails", collapseTextSpaces(event.target.value), {
        shouldValidate: true,
      });
    },
  });

  const teachingSummaryRegister = form.register("teachingSummary", {
    onBlur: (event) => {
      setValue("teachingSummary", collapseTextSpaces(event.target.value), {
        shouldValidate: true,
      });
    },
  });

  const studentResultsRegister = form.register("studentResults", {
    onBlur: (event) => {
      setValue("studentResults", collapseTextSpaces(event.target.value), {
        shouldValidate: true,
      });
    },
  });

  const sellingPointsRegister = form.register("sellingPoints", {
    onBlur: (event) => {
      setValue("sellingPoints", collapseTextSpaces(event.target.value), {
        shouldValidate: true,
      });
    },
  });
  const uploadErrorMessage = getUploadErrorMessage(
    formState.errors.certificatesAndQualifications,
  );

  if (isFetching) {
    return <p>Loading tutor details...</p>;
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <form id={formId} onSubmit={handleSubmit(onSubmit)}>
        <DialogTrigger asChild>
          <SquarePen className="cursor-pointer text-blue-500 hover:text-blue-700" />
        </DialogTrigger>

        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[700px] bg-white dark:bg-gray-800 dark:text-white/90 p-0 overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0"
        >
          <DialogHeader className="shrink-0 flex-row items-center justify-between bg-white dark:bg-gray-800 px-6 py-4 border-b z-40">
            <DialogTitle>Edit Tutor</DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </DialogClose>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  onValueChange={(val) =>
                    setValue("status", val as UpdateTutorSchema["status"])
                  }
                  value={watch("status")}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {TUTOR_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              <div
                className="space-y-2 cursor-not-allowed"
                title={EMAIL_IMMUTABLE_MESSAGE}
              >
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g johndoe@gmail.com"
                  value={watch("email") || ""}
                  className="cursor-not-allowed"
                  disabled
                  readOnly
                  aria-readonly="true"
                  aria-describedby={`email-immutable-help-${id}`}
                />
                <p id={`email-immutable-help-${id}`} className="sr-only">
                  {EMAIL_IMMUTABLE_MESSAGE}
                </p>
                {formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <DatePicker
                    id={`dateOfBirth-${id}`}
                    label="Date of Birth *"
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Age"
                    disabled
                    {...form.register("age", { valueAsNumber: true })}
                    min={18}
                  />
                  {formState.errors.age && (
                    <p className="text-sm text-red-500">
                      {formState.errors.age.message}
                    </p>
                  )}
                  {!formState.errors.age &&
                  watch("dateOfBirth") &&
                  !formState.errors.dateOfBirth ? (
                    <p className="text-sm text-muted-foreground">
                      Calculated from your date of birth
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    onValueChange={(val) =>
                      setValue("gender", val as UpdateTutorSchema["gender"])
                    }
                    value={watch("gender")}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {TUTOR_GENDER_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formState.errors.gender && (
                    <p className="text-sm text-red-500">
                      {formState.errors.gender.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality *</Label>
                  <Select
                    onValueChange={(val) =>
                      setValue(
                        "nationality",
                        val as UpdateTutorSchema["nationality"],
                      )
                    }
                    value={watch("nationality")}
                  >
                    <SelectTrigger id="nationality">
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      {NATIONALITY_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formState.errors.nationality && (
                    <p className="text-sm text-red-500">
                      {formState.errors.nationality.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="race">Race *</Label>
                  <Select
                    onValueChange={(val) =>
                      setValue("race", val as UpdateTutorSchema["race"])
                    }
                    value={watch("race")}
                  >
                    <SelectTrigger id="race">
                      <SelectValue placeholder="Select race" />
                    </SelectTrigger>
                    <SelectContent>
                      {RACE_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formState.errors.race && (
                    <p className="text-sm text-red-500">
                      {formState.errors.race.message}
                    </p>
                  )}
                </div>
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
                        selected as UpdateTutorSchema["tutorType"],
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
                      setValue("classType", selected as string[], {
                        shouldValidate: true,
                      })
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
                    setValue("tutorMediums", selected as string[], {
                      shouldValidate: true,
                    })
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
                    setValue("grades", selected as string[], {
                      shouldValidate: true,
                    })
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
                    setValue("subjects", selected as string[], {
                      shouldValidate: true,
                    })
                  }
                  disabled={!selectedGrades || selectedGrades.length === 0}
                />
                {formState.errors.subjects && (
                  <p className="text-sm text-red-500">
                    {formState.errors.subjects.message}
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <Label>Document Upload *</Label>
                <MultiFileUploader
                  mode="certificate"
                  defaultFiles={tutorData?.certificatesAndQualifications || []}
                  onUploaded={(items) =>
                    setValue(
                      "certificatesAndQualifications",
                      items as UpdateTutorSchema["certificatesAndQualifications"],
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    )
                  }
                />
                {uploadErrorMessage && (
                  <p className="text-sm text-red-500">{uploadErrorMessage}</p>
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
                      selected as UpdateTutorSchema["preferredLocations"],
                      { shouldValidate: true },
                    )
                  }
                  disabled={isPreferredLocationsDisabled}
                  searchable
                />
                {!isPreferredLocationsDisabled &&
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

                <div className="space-y-2">
                  <Label htmlFor="highestEducation">Highest Education *</Label>
                  <Select
                    onValueChange={(val) =>
                      setValue(
                        "highestEducation",
                        val as UpdateTutorSchema["highestEducation"],
                      )
                    }
                    value={watch("highestEducation")}
                  >
                    <SelectTrigger id="highestEducation">
                      <SelectValue placeholder="Select education" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_VALUES_EDIT.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formState.errors.highestEducation && (
                    <p className="text-sm text-red-500">
                      {formState.errors.highestEducation.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="academicDetails">Academic Details *</Label>
                <Textarea
                  id="academicDetails"
                  placeholder="Academic Details"
                  {...academicDetailsRegister}
                />
                {formState.errors.academicDetails && (
                  <p className="text-sm text-red-500">
                    {formState.errors.academicDetails.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="teachingSummary">Teaching Summary *</Label>
                <Textarea
                  id="teachingSummary"
                  placeholder="Teaching Summary"
                  {...teachingSummaryRegister}
                />
                {formState.errors.teachingSummary && (
                  <p className="text-sm text-red-500">
                    {formState.errors.teachingSummary.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentResults">Student Results *</Label>
                <Textarea
                  id="studentResults"
                  placeholder="Student Results"
                  {...studentResultsRegister}
                />
                {formState.errors.studentResults && (
                  <p className="text-sm text-red-500">
                    {formState.errors.studentResults.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellingPoints">Selling Points *</Label>
                <Textarea
                  id="sellingPoints"
                  placeholder="Selling Points"
                  {...sellingPointsRegister}
                />
                {formState.errors.sellingPoints && (
                  <p className="text-sm text-red-500">
                    {formState.errors.sellingPoints.message}
                  </p>
                )}
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
              isLoading={isUpdating}
            >
              Update Tutor
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
