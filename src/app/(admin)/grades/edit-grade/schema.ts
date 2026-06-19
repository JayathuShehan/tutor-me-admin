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

const gradeTitle = () =>
  noExtraSpaces("Title")
    .refine((val) => /^[\p{L}\p{N} ()&.\-]+$/u.test(val), {
      message:
        "Title can only include letters, numbers, spaces, parentheses, hyphens, ampersands, and periods",
    })
    .refine((val) => /\p{L}/u.test(val), {
      message: "Title must include at least one letter",
    });

export const updateGradeSchema = z.object({
  title: gradeTitle(),
  description: noExtraSpaces("Description"),

  subjects: z
    .array(z.string().min(1, "Subject ID is required"))
    .nonempty("At least one subject is required"),
});

export type UpdateGradeSchema = z.infer<typeof updateGradeSchema>;

export const initialFormValues: UpdateGradeSchema = {
  title: "",
  description: "",
  subjects: [],
};
