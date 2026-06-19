import { z } from "zod";

const singleSpaceTextRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const digitsOnlyRegex = /^\d{10}$/;
const zipRegex = /^\d{5}(-\d{4})?$/;

export const updateUserSchema = z.object({
  avatar: z.string(),

  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .regex(
      singleSpaceTextRegex,
      "Name should contain only letters with a single space between words",
    ),

  email: z.string().trim().min(1, "Email is required").email("Invalid email"),

  phoneNumber: z
    .string()
    .min(1, "Phone Number is required")
    .refine((value) => !/\s/.test(value), {
      message: "Phone Number must contain numeric values only",
    })
    .refine((value) => digitsOnlyRegex.test(value), {
      message: "Phone Number should be exactly 10 digits.",
    }),

  birthday: z
    .string()
    .min(1, "Date of Birth is required")
    .refine(
      (val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) return false;
        const today = new Date();
        const minDate = new Date(
          today.getFullYear() - 18,
          today.getMonth(),
          today.getDate(),
        );
        return date <= minDate;
      },
      { message: "Must be at least 18 years old" },
    ),

  country: z
    .string()
    .trim()
    .min(1, "Country is required")
    .regex(
      singleSpaceTextRegex,
      "Country should contain only letters with a single space between words",
    ),

  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .regex(
      singleSpaceTextRegex,
      "City should contain only letters with a single space between words",
    ),

  state: z
    .string()
    .trim()
    .min(1, "State is required")
    .regex(
      singleSpaceTextRegex,
      "State should contain only letters with a single space between words",
    ),

  region: z
    .string()
    .trim()
    .min(1, "Region is required")
    .regex(
      singleSpaceTextRegex,
      "Region should contain only letters with a single space between words",
    ),

  zip: z
    .string()
    .min(1, "Zip / Postal Code is required")
    .refine((value) => !/\s/.test(value), {
      message: "Zip /Postal code must contain numeric values only",
    })
    .refine((value) => zipRegex.test(value), {
      message: "Zip/Postal code should be exactly 5 digits",
    }),

  address: z.string().trim().min(1, "Address is required"),

  gender: z.enum(["male", "female", "other"], {
    message: "Gender is required",
  }),
});

export type UpdateUserSchema = z.infer<typeof updateUserSchema>;
