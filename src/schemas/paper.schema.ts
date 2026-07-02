import { MEDIUM_VALUES, type MediumValue } from "@/configs/app-constants";
import { normalizeTextSpaces } from "@/utils/form-normalizers";
import { z } from "zod";

const noExtraSpaces = (field: string) =>
  z
    .string()
    .transform((value) => normalizeTextSpaces(value) as string)
    .pipe(
      z
        .string()
        .min(1, `${field} is required`)
        .refine((val) => val.length > 0, {
          message: `${field} cannot be empty`,
        }),
    );

const paperTitle = () =>
  noExtraSpaces("Title")
    .refine((val) => /^[\p{L}\p{N} ().&/-]+$/u.test(val), {
      message:
        "Title can only include letters, numbers, spaces, dots, parentheses, hyphens, ampersands, and slashes",
    })
    .refine((val) => /\p{L}/u.test(val), {
      message: "Title must include at least one letter",
    });

export const paperSchema = z.object({
  title: paperTitle(),

  medium: z
    .union([z.literal(""), z.enum(MEDIUM_VALUES)])
    .refine((value) => value !== "", {
      message: "Medium is required",
    })
    .transform((value) => value as MediumValue),

  subject: z.string().min(1, "Subject is required"),
  grade: z.string().min(1, "Grade is required"),
  year: z.string().regex(/^\d{4}$/, "Year must be a 4-digit number"),
  url: z.string().url("Paper File is required"),
});

export type PaperSchema = z.infer<typeof paperSchema>;
export type PaperFormValues = z.input<typeof paperSchema>;

export const initialFormValues: PaperFormValues = {
  title: "",
  medium: "",
  subject: "",
  grade: "",
  year: "",
  url: "",
};
