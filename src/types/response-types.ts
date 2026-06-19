/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FaqCategory } from "@/lib/faq-categories";

export type Id = { id: string };
export type Timestamp = { createdAt: string; updatedAt: string };

export type BaseEntity = Id & Timestamp;

export type WithTitleDescription = {
  title: string;
  description: string;
};

// Reusable response wrapper
export type PaginatedResponse<T> = {
  results: T[];
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
};
export type Blogs = BaseEntity &
  WithTitleDescription & {
    _id: string;
    title: string;
    image: string;
    author: {
      name: string;
      avatar: string;
      role: string;
    };
    content: Array<
      | { type: "paragraph"; text: string }
      | { type: "heading"; text: string; level: number }
      | { type: "image"; src: string; caption?: string }
    >;
    relatedArticles: string[];
    status: "pending" | "approved" | "rejected";
  };
// FAQ
export type Faq = BaseEntity & {
  category?: FaqCategory;
  question: string;
  answer: string;
};

// Inquiry
export type Inquiry = {
  message: string;
  sender: {
    name: string;
    email: string;
  };
} & Id &
  Timestamp;

export type Level = {
  createdAt: string;
  updatedAt: string;
  id: string;
  details: string[];
  challanges: string[];
  subjects: Subject[];
  title: string;
};

export type TuitionRateItem = {
  _id: string;
  title: string;
  grade: Grade;
  subject: Subject;
  level: Level;
  universityStudentsRate: Rate;
  partTimeTutorRate: Rate;
  fullTimeTutorRate: Rate;
  moeTeacherRate: Rate;
};
export type Rate = {
  minimumRate: string;
  maximumRate: string;
};
export type TuitionRateGroup = {
  grade: any;
  subjects: any;
  _id: string;
  level: Level;
  items: TuitionRateItem[];
};
// Subject
export type Subject = BaseEntity & WithTitleDescription;

// Tag
export type Tag = BaseEntity & {
  name: string;
  description: string;
};

// User
export type Users = BaseEntity & {
  role: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthday: string;
  gender: "male" | "female" | "other" | string;
  status: string;
  isEmailVerified: boolean;
  country: string;
  city: string;
  state: string;
  region: string;
  zip: string;
  address: string;
  avatar?: string;
  tutorId?: string;
  referralCode?: string;
};

// Grade
export type Grade = BaseEntity &
  WithTitleDescription & {
    subjects: Subject[];
  };

//tuition rates
export type TuitionRate = {
  minimumRate: string;
  maximumRate: string;
};

export type EntityRef = {
  id: string;
  title: string;
};

export type TuitionRates = BaseEntity &
  WithTitleDescription & {
    subject: EntityRef;
    grade: EntityRef;
    universityStudentsRate: TuitionRate;
    partTimeTutorRate: TuitionRate;
    fullTimeTutorRate: TuitionRate;
    moeTeacherRate: TuitionRate;
  };

// Paper
export type Paper = BaseEntity & {
  title: string;
  medium: string;
  file: string;
  grade: Grade;
  subject: Subject;
  year: string;
  url: string;
};

// Testimonial
export type Testimonial = BaseEntity & {
  content: string;
  rating: number;
  owner: {
    name: string;
    role: string;
    avatar: string;
  };
};

export type ContactUsResponse = {
  message: string;
  sender: {
    name: string;
    email: string;
  };
} & Id &
  Timestamp;

export type UserBase = {
  role: string;
  status: string;
  isEmailVerified: boolean;
  grades: [];
  subjects: [];
  name: string;
  email: string;
} & Id &
  Timestamp;

export type UserRegisterResponse = {
  user: Omit<UserBase, "role" | "status" | "isEmailVerified"> & {
    role: "admin";
    status: "active";
    isEmailVerified: false;
  };
  tokens: {
    access: {
      token: string;
      expires: string;
    };
    refresh: {
      token: string;
      expires: string;
    };
  };
};

export type UserLoginResponse = {
  user: UserBase;
  tokens: {
    access: {
      token: string;
      expires: string;
    };
    refresh: {
      token: string;
      expires: string;
    };
  };
};

export type TuitionAssignment = {
  title: string;
  assignmentNumber: string;
  address: string;
  duration: string;
  gradeId: string;
  tutorId: string;
  assignmentPrice: string;
  __v: number;
  gradeName: string;
  tutorName: string;
  tutorType: string;
} & Id &
  Timestamp;

export type ProfileResponse = {
  role: string;
  status: string;
  isEmailVerified: boolean;
  grades: Grade[];
  subjects: Subject[];
  name: string;
  email: string;
  country: string;
  phoneNumber: string;
  city: string;
  state: string;
  region: string;
  zip: string;
  address: string;
  birthday: string;
  tutorType: string;
  gender: "Male" | "Female" | "None";
  duration: string;
  frequency: string;
  timeZone: string;
  language: string;
} & Id &
  Timestamp;

export type UpdatePasswordResponse = {
  message: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type TokenResponse = {
  access: {
    token: string;
    expires: string;
  };
  refresh: {
    token: string;
    expires: string;
  };
};

type PersonalInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  city: string;
  state: string;
  zip: string;
  region: string;
  grade: string;
};

type LessonDetail = {
  subjects: string[];
  duration: string;
  frequency: string;
};

type LessonInfo = {
  tutorCount: string;
  lessonDetails: LessonDetail[];
};

type TutorTypeInfo = {
  isBilingualTutor: boolean;
  tutorType: string;
  studentSchool: string;
  genderPreference: string;
};

export type CertificateItem = {
  id?: string;
  type: string;
  url: string;
};

export type Tutor = BaseEntity & {
  status: string;
  fullName: string;
  name: string;
  contactNumber: string;
  tutorMediums: string[];
  grades: string[];
  subjects: string[];
  classType: string[];
  email: string;
  dateOfBirth: string;
  gender: string;
  age: number;
  nationality: string;
  race: string;

  tutorType: string[];
  yearsExperience: number;
  highestEducation: string;
  academicDetails?: string;
  teachingSummary: string;
  studentResults: string;
  sellingPoints: string;
  tutoringLevels: string[];
  preferredLocations: string[];
  agreeTerms: boolean;
  agreeAssignmentInfo: boolean;
  certificatesAndQualifications: CertificateItem[];
  referralCode?: string;
  referredByCode?: string;
};

export type ReferralSummary = {
  referrerTutorId: string;
  referrerName: string;
  referrerEmail: string;
  referralCode: string;
  totalReferrals: number;
  pendingRewards: number;
};

export type ReferralReward = BaseEntity & {
  referrerTutorId: string;
  referredTutorId: {
    id: string;
    fullName: string;
    email: string;
    createdAt: string;
  };
  rewardSent: boolean;
};

export type Referee = BaseEntity & {
  name: string;
  email: string;
  contactNumber: string;
  gender: string;
  avatar?: string;
  referralCode: string;
  referralCount: number;
};

export type RefereeEmailAvailabilityResponse = {
  available: boolean;
  message: string;
};

export type BonusTransaction = BaseEntity & {
  referrerTutorId: string;
  referrerName: string;
  referrerEmail: string;
  adminId: string;
  adminEmail: string;
  rewardIds: string[] | BonusRewardDetail[];
  rewardCount: number;
  hasSlip: boolean;
  slip?: { fileName: string; mimeType: string; data?: string };
  createdAt: string;
};

export type BonusRewardDetail = {
  id: string;
  rewardSent: boolean;
  createdAt: string;
  referredTutorId: { fullName: string; email: string };
};

export type TutorEmailAvailabilityResponse = {
  available: boolean;
  message: string;
};

export type RequestTutorTutor = {
  id?: string;
  _id: string;
  subject: string;
  classType?: string | string[];
  preferredClassType?: string | string[];
  preferredTutorType: string;
  duration: string;
  frequency: string;
  assignedTutor: string | null;
};

export type RequestTutors = BaseEntity & {
  name: string;
  email: string;
  city: string;
  district: string;
  phoneNumber: string;
  medium: string;
  // "Assiged" and "Assigned" are kept only for older API records.
  status: "Pending" | "Rejected" | "Tutor Assigned" | "Assiged" | "Assigned";
  rejectionReason?: string;
  grade: string;
  tutors: RequestTutorTutor[];
  createdAt: string;
  updatedAt: string;
  telegramOutreachSentAt?: string | null;
  telegramOutreachSentBy?:
    | string
    | { id?: string; name?: string; email?: string }
    | null;
};

export type FindMyTutorResponse = {
  status: string;
  personalInfo: PersonalInfo;
  lessonInfo: LessonInfo;
  tutorTypeInfo: TutorTypeInfo;
} & Id &
  Timestamp;

export type FaqResponse = PaginatedResponse<Faq>;
export type InquiryResponse = PaginatedResponse<Inquiry>;
export type SubjectResponse = PaginatedResponse<Subject>;
export type GradeResponse = PaginatedResponse<Grade>;
export type PaperResponse = PaginatedResponse<Paper>;
export type TutorResponse = PaginatedResponse<Tutor>;
export type TestimonialResponse = PaginatedResponse<Testimonial>;
export type TuitionAssignmentResponse = PaginatedResponse<TuitionAssignment>;
