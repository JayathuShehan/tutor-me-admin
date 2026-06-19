import { z } from "zod";
import { normalizeTextSpaces } from "@/utils/form-normalizers";

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

const subjectTitle = () =>
  noExtraSpaces("Title")
    .refine((val) => /^[\p{L}\p{N} ().&-]+$/u.test(val), {
      message:
        "Title can only include letters, numbers, spaces, dots, parentheses, hyphens, and ampersands",
    })
    .refine((val) => /\p{L}/u.test(val), {
      message: "Title must include at least one letter",
    });

export const updateSubjectSchema = z.object({
  title: subjectTitle(),
  description: noExtraSpaces("Description"),
});

export type UpdateSubjectSchema = z.infer<typeof updateSubjectSchema>;

export const initialFormValues = {
  title: "",
  description: "",
};
