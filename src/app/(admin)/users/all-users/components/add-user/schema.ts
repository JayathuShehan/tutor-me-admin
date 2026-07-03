import { USER_ROLE_VALUES, USER_STATUS_VALUES } from "@/configs/app-constants";
import { z } from "zod";

export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .max(100, "Email too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(64, "Password must not exceed 64 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  role: z.enum(USER_ROLE_VALUES).default("tutor"),
  phoneNumber: z.string().regex(/^\+?[0-9]{1,10}$/, "Phone number is required"),
  status: z.enum(USER_STATUS_VALUES).default("pending"),
});

export type CreateUserSchema = z.infer<typeof createUserSchema>;

export const initialFormValues: CreateUserSchema = {
  email: "",
  password: "",
  name: "",
  role: "tutor",
  phoneNumber: "",
  status: "pending",
};
