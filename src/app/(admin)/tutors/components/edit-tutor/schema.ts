import {
  EDUCATION_VALUES_EDIT,
  NATIONALITY_VALUES,
  PREFERRED_LOCATION_VALUES,
  RACE_VALUES,
  TUTOR_GENDER_VALUES,
  TUTOR_STATUS_VALUES,
  TUTOR_TYPE_VALUES,
} from "@/configs/app-constants";
import { normalizeTextSpaces } from "@/utils/form-normalizers";
import { z } from "zod";

const hasPhysicalClassType = (classTypes: string[] = []) =>
  classTypes.some((classType) =>
    classType.toLowerCase().startsWith("physical"),
  );

const normalizedTextSchema = z
  .string()
  .transform((value) => normalizeTextSpaces(value) as string);

export const updateTutorSchema = z
  .object({
    fullName: z
      .string()
      .transform((value) => normalizeTextSpaces(value) as string)
      .pipe(
        z
          .string()
          .min(1, "Full Name is required")
          .regex(
            /^[A-Za-z\s]+$/,
            "Full Name can contain letters and spaces only",
          ),
      )
      .optional(),
    contactNumber: z
      .string()
      .trim()
      .min(1, "Contact Number is required")
      .pipe(
        z
          .string()
          .regex(/^\d+$/, "Contact number must contain only numbers")
          .length(10, "Contact number must be exactly 10 digits"),
      )
      .optional(),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .pipe(z.string().email("Email must be valid"))
      .optional(),
    dateOfBirth: z
      .string()
      .trim()
      .min(1, "Date of Birth is required")
      .pipe(
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of Birth must be in YYYY-MM-DD"),
      )
      .optional(),
    gender: z.enum(TUTOR_GENDER_VALUES).optional(),
    age: z
      .number()
      .int()
      .min(18, "Must be at least 18 years old")
      .max(80, "Age must be below 80")
      .optional(),
    tutorMediums: z
      .array(z.string())
      .min(1, "Select at least one medium")
      .optional(),
    grades: z.array(z.string()).min(1, "Select at least one grade").optional(),
    subjects: z
      .array(z.string())
      .min(1, "Select at least one subject")
      .optional(),

    nationality: z.enum(NATIONALITY_VALUES).optional(),
    race: z.enum(RACE_VALUES).optional(),

    status: z.enum(TUTOR_STATUS_VALUES).optional(),

    classType: z
      .array(z.string())
      .min(1, "Select at least one class type")
      .optional(),

    preferredLocations: z.array(z.enum(PREFERRED_LOCATION_VALUES)).optional(),

    tutorType: z
      .array(z.enum(TUTOR_TYPE_VALUES))
      .min(1, "Select at least one tutor type")
      .optional(),

    yearsExperience: z
      .number()
      .int()
      .min(1, "Years of Experience are required")
      .max(50)
      .optional(),

    highestEducation: z.enum(EDUCATION_VALUES_EDIT).optional(),

    academicDetails: normalizedTextSchema.pipe(z.string().max(1000)).optional(),

    teachingSummary: normalizedTextSchema.pipe(z.string().max(750)).optional(),
    studentResults: normalizedTextSchema.pipe(z.string().max(750)).optional(),
    sellingPoints: normalizedTextSchema.pipe(z.string().max(750)).optional(),

    agreeTerms: z.boolean().optional(),
    agreeAssignmentInfo: z.boolean().optional(),
    certificatesAndQualifications: z
      .array(
        z.object({
          id: z.string().optional(),
          type: z.string().trim().min(1, "Document Type is required"),
          url: z.string().url("Must be a valid URL"),
        }),
      )
      .min(1, "At least one certificate or qualification is required"),
  })
  .superRefine((data, ctx) => {
    if (
      hasPhysicalClassType(data.classType) &&
      (data.preferredLocations || []).length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one preferred location",
        path: ["preferredLocations"],
      });
    }
  });

export type UpdateTutorSchema = z.infer<typeof updateTutorSchema>;
