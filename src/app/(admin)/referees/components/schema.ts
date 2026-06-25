import { z } from "zod";

export const refereeGenderValues = ["male", "female"] as const;

export const addRefereeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email address").max(100, "Email too long"),
  contactNumber: z
    .string()
    .regex(/^[0-9]{10}$/, "Enter a valid 10-digit contact number"),
  gender: z.enum(refereeGenderValues, {
    error: "Gender is required",
  }),
  avatar: z.string().optional(),
  accountName: z
    .string()
    .max(100, "Account name too long")
    .refine((v) => !v || /^[A-Za-z' ()-]+$/.test(v), {
      message:
        "Only letters, spaces, hyphens, apostrophes, and parentheses are allowed",
    })
    .optional(),
  accountNumber: z
    .string()
    .max(30, "Account number too long")
    .refine((v) => !v || /^[0-9]+$/.test(v), {
      message: "Account number must contain only digits",
    })
    .optional(),
  bankName: z
    .string()
    .max(100, "Bank name too long")
    .refine((v) => !v || /^[A-Za-z' ()-]+$/.test(v), {
      message:
        "Only letters, spaces, hyphens, apostrophes, and parentheses are allowed",
    })
    .optional(),
});

export type AddRefereeFormValues = z.infer<typeof addRefereeSchema>;

export const initialRefereeFormValues: AddRefereeFormValues = {
  name: "",
  email: "",
  contactNumber: "",
  gender: "" as AddRefereeFormValues["gender"],
  avatar: "",
  accountName: "",
  accountNumber: "",
  bankName: "",
};
