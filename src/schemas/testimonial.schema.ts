import { normalizeTextSpaces, trimText } from "@/utils/form-normalizers";
import { z } from "zod";

const requiredText = (message: string) =>
  z
    .string()
    .transform((value) => normalizeTextSpaces(value) as string)
    .pipe(z.string().min(1, message));

const alphabeticText = (requiredMessage: string, invalidMessage: string) =>
  z
    .string()
    .transform((value) => normalizeTextSpaces(value) as string)
    .pipe(
      z
        .string()
        .min(1, requiredMessage)
        .regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, invalidMessage),
    );

const ownerRoleText = z
  .string()
  .transform((value) => normalizeTextSpaces(value) as string)
  .pipe(
    z
      .string()
      .min(1, "Owner role is required")
      .refine(
        (value) => /^[A-Za-z ().&-]+$/.test(value) && /[A-Za-z]/.test(value),
        "Owner role can only include letters, spaces, dots, parentheses, hyphens, and ampersands",
      ),
  );

export const testimonialSchema = z.object({
  content: requiredText("Content is required"),
  rating: z.number().min(1, "Rating is required"), // number instead of string
  owner: z.object({
    name: alphabeticText(
      "Owner name is required",
      "Owner name can contain letters and spaces only",
    ),
    role: ownerRoleText,
    avatar: z
      .string()
      .transform((value) => trimText(value) as string)
      .pipe(
        z.union([
          z.literal(""),
          z.string().url("Please upload a valid image."),
        ]),
      ),
  }),
});

export type TestimonialSchema = z.infer<typeof testimonialSchema>;

export const initialFormValues: TestimonialSchema = {
  content: "",
  rating: 0,
  owner: {
    name: "",
    role: "",
    avatar: "",
  },
};
