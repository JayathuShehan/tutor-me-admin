import type { ChangeEvent, FocusEvent } from "react";
import type {
  FieldValues,
  Path,
  PathValue,
  RegisterOptions,
  UseFormSetValue,
} from "react-hook-form";

export const normalizeTextSpaces = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;

export const trimText = (value: unknown) =>
  typeof value === "string" ? value.trim() : value;

export const removeWhitespace = <T>(value: T): T extends string ? string : T =>
  (typeof value === "string"
    ? value.replace(/\s+/g, "")
    : value) as T extends string ? string : T;

export const stripLeadingSpaces = (value: string) => value.replace(/^\s+/, "");

export const collapseTextSpaces = (value: string) =>
  value.replace(/^\s+/, "").replace(/\s+/g, " ").trimEnd();

export const collapseRepeatedSpaces = (value: string) =>
  value.replace(/^\s+/, "").replace(/\s{2,}/g, " ");

export const normalizeLettersAndSpacesInput = (value: string) =>
  value
    .replace(/[^A-Za-z ]/g, "")
    .replace(/\s{2,}/g, " ")
    .trimStart();

export const normalizeRoleInput = (value: string) =>
  value
    .replace(/[^A-Za-z ().&-]/g, "")
    .replace(/\s{2,}/g, " ")
    .trimStart();

export const normalizeDecimalInput = (value: string) => {
  const digitsAndDots = value.replace(/[^0-9.]/g, "");
  const [integerPart, ...decimalParts] = digitsAndDots.split(".");

  if (decimalParts.length === 0) return integerPart;

  return `${integerPart}.${decimalParts.join("")}`;
};

export const liveTextInputRegisterOptions = <T extends FieldValues>(
  name: Path<T>,
  setValue: UseFormSetValue<T>,
  shouldValidateOnChange = false,
): Pick<RegisterOptions<T, Path<T>>, "onChange" | "onBlur"> => ({
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const cleaned = stripLeadingSpaces(event.target.value);

    if (cleaned !== event.target.value) {
      event.target.value = cleaned;
      setValue(name, cleaned as PathValue<T, Path<T>>, {
        shouldValidate: shouldValidateOnChange,
      });
    }
  },
  onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(
      name,
      collapseTextSpaces(event.target.value) as PathValue<T, Path<T>>,
      {
        shouldValidate: true,
      },
    );
  },
});

// Like liveTextInputRegisterOptions, but also collapses repeated spaces to a
// single one as the user types, so only one space between words is allowed.
export const singleSpaceTextInputRegisterOptions = <T extends FieldValues>(
  name: Path<T>,
  setValue: UseFormSetValue<T>,
  shouldValidateOnChange = false,
): Pick<RegisterOptions<T, Path<T>>, "onChange" | "onBlur"> => ({
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const cleaned = collapseRepeatedSpaces(event.target.value);

    if (cleaned !== event.target.value) {
      event.target.value = cleaned;
      setValue(name, cleaned as PathValue<T, Path<T>>, {
        shouldValidate: shouldValidateOnChange,
      });
    }
  },
  onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(
      name,
      collapseTextSpaces(event.target.value) as PathValue<T, Path<T>>,
      {
        shouldValidate: true,
      },
    );
  },
});

export const alphabeticTextInputRegisterOptions = <T extends FieldValues>(
  name: Path<T>,
  setValue: UseFormSetValue<T>,
  shouldValidateOnChange = false,
): Pick<RegisterOptions<T, Path<T>>, "onChange" | "onBlur"> => ({
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const cleaned = normalizeLettersAndSpacesInput(event.target.value);

    if (cleaned !== event.target.value) {
      event.target.value = cleaned;
      setValue(name, cleaned as PathValue<T, Path<T>>, {
        shouldValidate: shouldValidateOnChange,
      });
    }
  },
  onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(
      name,
      collapseTextSpaces(event.target.value) as PathValue<T, Path<T>>,
      {
        shouldValidate: true,
      },
    );
  },
});

export const roleTextInputRegisterOptions = <T extends FieldValues>(
  name: Path<T>,
  setValue: UseFormSetValue<T>,
  shouldValidateOnChange = false,
): Pick<RegisterOptions<T, Path<T>>, "onChange" | "onBlur"> => ({
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const cleaned = normalizeRoleInput(event.target.value);

    if (cleaned !== event.target.value) {
      event.target.value = cleaned;
      setValue(name, cleaned as PathValue<T, Path<T>>, {
        shouldValidate: shouldValidateOnChange,
      });
    }
  },
  onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(
      name,
      collapseTextSpaces(event.target.value) as PathValue<T, Path<T>>,
      {
        shouldValidate: true,
      },
    );
  },
});

export const decimalInputRegisterOptions = <T extends FieldValues>(
  name: Path<T>,
  setValue: UseFormSetValue<T>,
  shouldValidateOnChange = false,
  afterChange?: () => void,
): Pick<RegisterOptions<T, Path<T>>, "onChange" | "onBlur"> => ({
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const cleaned = normalizeDecimalInput(event.target.value);

    if (cleaned !== event.target.value) {
      event.target.value = cleaned;
      setValue(name, cleaned as PathValue<T, Path<T>>, {
        shouldValidate: shouldValidateOnChange,
      });
    }

    afterChange?.();
  },
  onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(
      name,
      normalizeDecimalInput(event.target.value) as PathValue<T, Path<T>>,
      {
        shouldValidate: true,
      },
    );
  },
});

export const noWhitespaceInputRegisterOptions = <T extends FieldValues>(
  name: Path<T>,
  setValue: UseFormSetValue<T>,
  shouldValidateOnChange = false,
  lowercaseOnBlur = false,
  afterChange?: () => void,
): Pick<RegisterOptions<T, Path<T>>, "onChange" | "onBlur"> => ({
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const cleaned = removeWhitespace(event.target.value);

    if (cleaned !== event.target.value) {
      event.target.value = cleaned;
      setValue(name, cleaned as PathValue<T, Path<T>>, {
        shouldValidate: shouldValidateOnChange,
      });
    }

    afterChange?.();
  },
  onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const cleaned = removeWhitespace(event.target.value);
    setValue(
      name,
      (lowercaseOnBlur ? cleaned.toLowerCase() : cleaned) as PathValue<
        T,
        Path<T>
      >,
      {
        shouldValidate: true,
      },
    );
  },
});
