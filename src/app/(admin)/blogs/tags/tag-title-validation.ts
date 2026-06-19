import type { Tag } from "@/types/response-types";

export const DUPLICATE_TAG_TITLE_MESSAGE = "Title already taken";

export const normalizeTagTitle = (title: string) =>
  title.trim().replace(/\s+/g, " ").toLowerCase();

export const hasDuplicateTagTitle = (
  tags: Tag[],
  title: string,
  currentTagId?: string,
) => {
  const normalizedTitle = normalizeTagTitle(title);

  return tags.some(
    (tag) =>
      tag.id !== currentTagId &&
      normalizeTagTitle(tag.name) === normalizedTitle,
  );
};

export const getTagTitleErrorMessage = (error: string) => {
  const normalizedError = error.toLowerCase();

  if (
    normalizedError.includes("duplicate") ||
    normalizedError.includes("already exists") ||
    normalizedError.includes("already taken")
  ) {
    return DUPLICATE_TAG_TITLE_MESSAGE;
  }

  return error;
};
