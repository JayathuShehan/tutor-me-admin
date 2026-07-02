import { PREFERRED_LOCATION_OPTIONS as _PREFERRED_LOCATION_OPTIONS } from "./cities";

// ─── Tutor Status ─────────────────────────────────────────────────────────────

export const TUTOR_STATUS_VALUES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;
export type TutorStatusValue = (typeof TUTOR_STATUS_VALUES)[number];

export const TUTOR_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
] as const;

export const TUTOR_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
] as const;

export const TUTOR_STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  suspended: "bg-gray-200 text-gray-600 border-gray-300",
};

export const TUTOR_STATUS_STYLE_CLASSES: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  approved:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  suspended: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

// ─── User / Account ───────────────────────────────────────────────────────────

export const USER_STATUS_VALUES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;
export type UserStatusValue = (typeof USER_STATUS_VALUES)[number];

export const USER_ROLE_VALUES = ["tutor", "admin"] as const;
export type UserRoleValue = (typeof USER_ROLE_VALUES)[number];

export const USER_GENDER_VALUES = ["male", "female"] as const;
export type UserGenderValue = (typeof USER_GENDER_VALUES)[number];

// ─── Tutor Demographics ───────────────────────────────────────────────────────

export const TUTOR_GENDER_VALUES = ["Male", "Female"] as const;
export type TutorGenderValue = (typeof TUTOR_GENDER_VALUES)[number];

export const NATIONALITY_VALUES = ["Sri Lankan", "Others"] as const;
export type NationalityValue = (typeof NATIONALITY_VALUES)[number];

export const RACE_VALUES = [
  "Sinhalese",
  "Tamil",
  "Muslim",
  "Burgher",
  "Others",
] as const;
export type RaceValue = (typeof RACE_VALUES)[number];

// ─── Preferred Locations ──────────────────────────────────────────────────────

export const NOT_PREFERRED_LOCATION_VALUE = "No Preference";
export const PREFERRED_LOCATION_OPTIONS = _PREFERRED_LOCATION_OPTIONS;
export const PREFERRED_LOCATION_VALUES = [
  ..._PREFERRED_LOCATION_OPTIONS.map((o) => o.value),
  NOT_PREFERRED_LOCATION_VALUE,
] as unknown as [string, ...string[]];
export type PreferredLocationValue = string;

// ─── Tutoring Levels ──────────────────────────────────────────────────────────

export const TUTORING_LEVEL_VALUES = [
  "Pre-School / Montessori",
  "Primary School (Grades 1-5)",
  "Ordinary Level (O/L) (Grades 6-11)",
  "Advanced Level (A/L) (Grades 12-13)",
  "International Syllabus (Cambridge, Edexcel, IB)",
  "Undergraduate",
  "Diploma / Degree",
  "Language (e.g., English, French, Japanese)",
  "Computing (e.g., Programming, Graphic Design)",
  "Music & Arts",
  "Special Skills",
] as const;
export type TutoringLevelValue = (typeof TUTORING_LEVEL_VALUES)[number];

export const TUTORING_LEVEL_OPTIONS = TUTORING_LEVEL_VALUES.map((v) => ({
  value: v,
  text: v,
}));

// ─── Tutor Type ───────────────────────────────────────────────────────────────

export const TUTOR_TYPE_VALUES = [
  "International School Teacher",
  "Government School Teacher",
  "University Student",
  "Diploma Holder",
  "Part-time Tutor",
  "Full-time Tutor",
] as const;
export type TutorTypeValue = (typeof TUTOR_TYPE_VALUES)[number];

export const TUTOR_TYPE_OPTIONS = TUTOR_TYPE_VALUES.map((v) => ({
  value: v,
  text: v,
}));

// ─── Class Type ───────────────────────────────────────────────────────────────

export const CLASS_TYPE_VALUES = [
  "Online - Individual",
  "Online - Group",
  "Physical - Individual",
  "Physical - Group",
] as const;
export type ClassTypeValue = (typeof CLASS_TYPE_VALUES)[number];

export const CLASS_TYPE_OPTIONS = CLASS_TYPE_VALUES.map((v) => ({
  value: v,
  text: v,
}));

// ─── Highest Education (Add Tutor form) ───────────────────────────────────────

export const EDUCATION_VALUES_ADD = [
  "PhD",
  "Masters Degree",
  "Undergraduate",
  "Bachelor Degree",
  "Diploma and Professional",
  "Advanced Level (A/L)",
] as const;
export type EducationAddValue = (typeof EDUCATION_VALUES_ADD)[number];

export const EDUCATION_OPTIONS_ADD = EDUCATION_VALUES_ADD.map((v) => ({
  value: v,
  text: v,
}));

// ─── Highest Education (Edit Tutor form) ─────────────────────────────────────

export const EDUCATION_VALUES_EDIT = EDUCATION_VALUES_ADD;
export type EducationEditValue = (typeof EDUCATION_VALUES_EDIT)[number];

// ─── Years of Experience ──────────────────────────────────────────────────────

export const YEARS_EXPERIENCE_OPTIONS = [
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: 6, label: "6" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
  { value: 9, label: "9" },
  { value: 10, label: "10+" },
] as const;

// ─── Paper / Tutor Medium ─────────────────────────────────────────────────────

export const MEDIUM_VALUES = ["Sinhala", "English", "Tamil"] as const;
export type MediumValue = (typeof MEDIUM_VALUES)[number];

export const MEDIUM_OPTIONS = MEDIUM_VALUES.map((v) => ({
  label: v,
  value: v,
}));

export const TUTOR_MEDIUM_OPTIONS = MEDIUM_VALUES.map((v) => ({
  value: v,
  text: v,
}));

// ─── Certificate Types ────────────────────────────────────────────────────────

export const CERTIFICATE_TYPE_VALUES = [
  "NIC",
  "Passport",
  "Degree Certificate",
  "A/L Certificate",
  "O/L Certificate",
  "Professional Certificate",
  "Teaching Certificate",
  "Others",
] as const;
export type CertificateTypeValue = (typeof CERTIFICATE_TYPE_VALUES)[number];

// Educational/qualification documents are mandatory — a tutor cannot be created
// without uploading at least one of these. Identity/supporting documents below
// are optional. Mirrors the public tutor-registration form.
export const MANDATORY_CERTIFICATE_TYPE_VALUES = [
  "Degree Certificate",
  "A/L Certificate",
  "O/L Certificate",
  "Professional Certificate",
  "Teaching Certificate",
] as const satisfies readonly CertificateTypeValue[];

export const OPTIONAL_CERTIFICATE_TYPE_VALUES = [
  "NIC",
  "Passport",
  "Others",
] as const satisfies readonly CertificateTypeValue[];

const MANDATORY_CERTIFICATE_TYPE_SET = new Set<string>(
  MANDATORY_CERTIFICATE_TYPE_VALUES,
);

export const isMandatoryCertificateType = (type: string): boolean =>
  MANDATORY_CERTIFICATE_TYPE_SET.has(type.trim());

// ─── Blog / Article Status ────────────────────────────────────────────────────

export const BLOG_STATUS_VALUES = [
  "pending",
  "published",
  "draft",
  "rejected",
] as const;
export type BlogStatusValue = (typeof BLOG_STATUS_VALUES)[number];
