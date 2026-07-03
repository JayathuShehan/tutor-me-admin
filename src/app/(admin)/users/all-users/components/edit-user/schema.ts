import {
  USER_GENDER_VALUES,
  USER_ROLE_VALUES,
  USER_STATUS_VALUES,
} from "@/configs/app-constants";
import { z } from "zod";

const getMinimumAdultBirthDate = () => {
  const today = new Date();
  return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
};

const parseBirthday = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return !isNaN(date.getTime()) ? date : null;
};

export const updateUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .max(100, "Email too long"),

  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, {
      message: "Name can contain letters and spaces only",
    }),

  role: z.enum(USER_ROLE_VALUES).optional(),

  phoneNumber: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\d+$/, "Phone number must contain only numbers")
    .length(10, "Phone number must be exactly 10 digits"),

  birthday: z
    .union([z.string(), z.date()])
    .refine((val) => val !== "" && val !== null && val !== undefined, {
      message: "Date of Birth is required",
    })
    .refine(
      (val) => {
        const dob = parseBirthday(val);
        if (!dob) return false;

        const today = new Date();
        const todayStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );

        return dob < todayStart;
      },
      {
        message: "Birthday cannot be a future date",
      },
    )
    .refine(
      (val) => {
        const dob = parseBirthday(val);
        if (!dob) return false;

        return dob <= getMinimumAdultBirthDate();
      },
      {
        message: "User must be at least 18 years old",
      },
    )
    .transform((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) ? date.toISOString().split("T")[0] : "";
    })
    .refine((val) => {
      const birthday = new Date(val);
      return (
        !isNaN(birthday.getTime()) && birthday <= getMinimumAdultBirthDate()
      );
    }, "User must be at least 18 years old"),

  status: z.enum(USER_STATUS_VALUES).default("pending"),

  gender: z.enum(USER_GENDER_VALUES, {
    message: "Gender is required",
  }),

  avatar: z.preprocess(
    (val) => (val === undefined || val === null ? "" : val),
    z
      .string()
      .trim()
      .min(1, "Profile Picture is required")
      .url("Invalid profile picture URL")
      .max(255, "Avatar URL too long"),
  ),
});

export type UpdateUserSchema = z.infer<typeof updateUserSchema>;

export const initialFormValues: UpdateUserSchema = {
  email: "",
  name: "",
  role: "tutor",
  phoneNumber: "",
  birthday: "",
  status: "pending",
  gender: "" as UpdateUserSchema["gender"],
  avatar: "",
};
