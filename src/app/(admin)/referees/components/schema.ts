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
});

export type AddRefereeFormValues = z.infer<typeof addRefereeSchema>;

export const initialRefereeFormValues: AddRefereeFormValues = {
  name: "",
  email: "",
  contactNumber: "",
  gender: "" as AddRefereeFormValues["gender"],
  avatar: "",
};
