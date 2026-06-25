import {
  CLASS_TYPE_VALUES,
  EDUCATION_VALUES_ADD,
  PREFERRED_LOCATION_VALUES,
  TUTOR_GENDER_VALUES,
  TUTOR_TYPE_VALUES,
} from "@/configs/app-constants";
import { z } from "zod";

const hasPhysicalClassType = (classTypes: string[] = []) =>
  classTypes.some((classType) =>
    classType.toLowerCase().startsWith("physical"),
  );

export const addTutorSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Full Name is required")
      .regex(/^[A-Za-z\s]+$/, "Full Name can contain letters and spaces only"),

    contactNumber: z
      .string()
      .trim()
      .min(1, "Contact Number is required")
      .regex(/^[0-9]+$/, "Contact number must contain only numbers")
      .length(10, "Contact number must be exactly 10 digits"),

    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Email must be valid"),

    dateOfBirth: z
      .string()
      .trim()
      .min(1, "Date of Birth is required")
      .pipe(
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of Birth must be in YYYY-MM-DD"),
      ),

    gender: z.enum(TUTOR_GENDER_VALUES, { message: "Gender is required" }),
    age: z
      .number()
      .int()
      .min(18, "Must be at least 18 years old")
      .max(80, "Age must be below 80"),

    tutorMediums: z
      .array(z.string())
      .min(1, "Please select at least one medium."),

    grades: z.array(z.string()).min(1, "Select at least one grade"),
    subjects: z.array(z.string()).min(1, "Select at least one subject"),

    classType: z
      .array(z.enum(CLASS_TYPE_VALUES))
      .min(1, "Select at least one class type"),

    preferredLocations: z.array(z.enum(PREFERRED_LOCATION_VALUES)),

    tutorType: z
      .array(z.enum(TUTOR_TYPE_VALUES))
      .min(1, "Select at least one tutor type"),

    yearsExperience: z
      .number()
      .int()
      .min(1, "Years of Experience are required")
      .max(50),

    highestEducation: z.enum(EDUCATION_VALUES_ADD, {
      message: "Highest Education is required",
    }),

    certificatesAndQualifications: z
      .array(
        z.object({
          id: z.string().optional(),
          type: z.string().trim().min(1, "Document Type is required"),
          url: z.string().url("Must be a valid URL"),
        }),
      )
      .min(1, "At least one certificate or qualification is required"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(12, "Password must be at most 12 characters")
      .regex(/^\S+$/, "Password must not contain spaces")
      .regex(
        /(?=.*[A-Za-z])(?=.*\d).+/,
        "Password must contain at least one letter and one number",
      ),

    confirmPassword: z
      .string()
      .min(1, "Please confirm your password")
      .regex(/^\S+$/, "Confirm Password must not contain spaces"),

    agreeTerms: z
      .boolean()
      .refine((val) => val === true, "You must agree to Terms and Conditions"),

    agreeAssignmentInfo: z
      .boolean()
      .refine((val) => val === true, "You must agree to Assignment Info"),
  })
  .superRefine((data, ctx) => {
    if (
      hasPhysicalClassType(data.classType) &&
      data.preferredLocations.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one preferred location",
        path: ["preferredLocations"],
      });
    }

    if (data.confirmPassword !== data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export type AddTutorFormValues = z.infer<typeof addTutorSchema>;

export const initialTutorFormValues: AddTutorFormValues = {
  fullName: "",
  contactNumber: "",
  email: "",
  dateOfBirth: "",
  gender: "" as AddTutorFormValues["gender"],
  age: 0,
  tutorMediums: [],
  grades: [],
  subjects: [],

  classType: [],
  preferredLocations: [],
  tutorType: [],
  yearsExperience: 0,
  highestEducation: "" as AddTutorFormValues["highestEducation"],
  certificatesAndQualifications: [],
  password: "",
  confirmPassword: "",
  agreeTerms: false,
  agreeAssignmentInfo: false,
};
