import type { FaqCategory } from "@/lib/faq-categories";

export type ContactUsRequest = {
  message: string;
  sender: {
    name: string;
    email: string;
  };
};
export type FetchBlogsRequest = {
  blogId?: string;
  image?: string;
  status?: "pending" | "approved" | "draft";
  authorName?: string;
  title?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
};

export type UpdateBlogRequest = {
  id: string;
  name: string;
  avatar: string;
  role: string;
  image?: string;
  relatedArticles: string[];
  status?: "pending" | "approved" | "rejected";
  authorName?: string;
  title?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
};

export type UpdateBlogStatusRequest = {
  blogId: string;
  status?: "pending" | "approved" | "rejected";
};
export type UpdateTutorRequestsRequest = {
  requestId: string;
  status?: "Pending" | "Rejected" | "Tutor Assigned";
  rejectionReason?: string;
};

export type UserLoginRequest = {
  email: string;
  password: string;
};

export type UserRefreshTokenRequest = {
  refreshToken: string;
};

export type UserLogoutRequest = {
  refreshToken: string;
};

export type UserRegisterRequest = {
  email: string;
  password: string;
  name: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type CreateAdminRequest = {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
};

export type ResetPasswordRequest = {
  token: string;
  password: string;
};

export type UpdateProfileRequest = {
  id: string;
  payload: {
    name?: string;
    email?: string;
    grade?: string;
    subjects?: string[];
    country?: string;
    phoneNumber?: string;
    city?: string;
    state?: string;
    region?: string;
    zip?: string;
    address?: string;
    birthday?: string | Date;
    tutorType?: string;
    gender?: string;
    duration?: string;
    timeZone?: string;
    language?: string;
  };
};

export type UpdatePasswordRequest = {
  id: string;
  payload: {
    currentPassword: string;
    newPassword: string;
  };
};

export type FetchProfileRequest = {
  userId: string;
};

export type FetchFaqRequest = {
  page: number;
  limit: number;
  category?: FaqCategory;
  sortBy?: string;
};

export type FetchInquiryRequest = {
  page: number;
  limit: number;
  message?: string;
  name?: string;
  email?: string;
  sortBy?: string;
};

export type FetchLevelRequest = {
  page: number;
  limit: number;
  title: string;
  details: string[];
  challenges?: string[];
  subjects: string[];
  levelId: string;
};

export type FetchPapersRequest = {
  page: number;
  limit: number;
  title?: string;
  grade?: string;
  subject?: string;
  year?: string;
  medium?: string;
  sortBy?: string;
  order?: string;
};

export type CreateTagRequest = {
  name: string;
  description: string;
};

export type UpdateTagRequest = {
  id: string;
  name: string;
  description: string;
};

export type FetchTagsRequest = {
  name?: string;
  description?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  tagId?: string;
};

export type CreateSubjectRequest = {
  title: string;
  description: string;
};

export type UpdateSubjectRequest = {
  id: string;
  title: string;
  description: string;
};
export type UpdateUserRequest = {
  id: string;
  name?: string;
  role?: "tutor" | "admin";
  phoneNumber?: string;
  birthday?: string;
  status?: "pending" | "approved" | "rejected" | "suspended";
  gender?: string;
  avatar?: string;
};

export type UpdateUserStatusRequest = {
  id: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejectionMessage?: string;
};

export type UpdateGradeRequest = {
  id: string;
  title: string;
  description: string;
  subjects: string[];
};

export type FetchGradesRequest = {
  title?: string;
  description?: string;
  subjects?: string[];
  page?: number;
  sortBy?: string;
  limit?: number;
  gradeId?: string;
};

export type TuitionRate = {
  minimumRate: string;
  maximumRate: string;
};

export type UpdateTuitionRateRequest = {
  id: string;
  subject: string;
  grade: string;
  universityStudentsRate?: TuitionRate;
  partTimeTutorRate?: TuitionRate;
  fullTimeTutorRate?: TuitionRate;
  moeTeacherRate?: TuitionRate;
};

export type FetchTuitionRatesRequest = {
  search?: string;
  subject?: string | string[];
  grade?: string | string[];
  universityStudentsRate?: TuitionRate;
  partTimeTutorRate?: TuitionRate;
  fullTimeTutorRate?: TuitionRate;
  moeTeacherRate?: TuitionRate;
  page?: number;
  sortBy?: string;
  limit?: number;
  rateId?: string;
};

export type FetchSubjectsRequest = {
  title?: string;
  description?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  subjectId?: string;
};

export type FetchUserRequest = {
  search?: string;
  email?: string;
  password?: string;
  name?: string;
  role?: string;
  phoneNumber?: string;
  birthday?: string;
  status?: string;
  country?: string;
  city?: string;
  state?: string;
  region?: string;
  zip?: string;
  address?: string;
  tutorType?: string;
  gender?: string;
  duration?: string;
  frequency?: string;
  timezone?: string;
  language?: string;
  avatar?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  userId?: string;
};

export type FetchTutorsRequest = {
  search?: string;
  status?: "pending" | "approved" | "suspended" | "rejected";
  fullName?: string;
  contactNumber?: string;
  tutorMediums?: string;
  grades?: string;
  subjects?: string;
  email?: string;
  gender?: string;
  nationality?: string;
  tutorType?: string;
  classType?: string;
  preferredLocations?: string;
  yearsExperience?: number;
  highestEducation?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  tutorId?: string;
  gradeId?: string;
  subjectId?: string;
};
export type FetchRequestForTutor = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  requestTutorId?: string;
  name?: string;
  email?: string;
  city?: string;
  district?: string;
  grade?: string;
  medium?: string;
  status?: string;
  phoneNumber?: string;
  subject?: string;
  assignedTutor?: string;
  preferredTutorType?: string;
  preferredClassType?: string;
  duration?: string;
  frequency?: string;
  state?: string;
  region?: string;
  zip?: string;
  tutors?: string[];
  subjects?: string[];
};
export type CreateTutorRequest = {
  fullName: string;
  contactNumber: string;
  confirmContactNumber: string;
  email: string;
  dateOfBirth: string;
  confirmDateOfBirth: string;
  gender: string;
  age: number;
  nationality: string;
  race: string;

  tutoringLevels: string[];
  preferredLocations: string[];
  tutorType: string[];
  yearsExperience: number;
  highestEducation: string;
  academicDetails: string;
  teachingSummary: string;
  studentResults: string;
  sellingPoints: string;
  agreeTerms: boolean;
  agreeAssignmentInfo: boolean;
  certificatesAndQualifications?: string[];
  captchaToken: string;
};

export type UpdateTutorRequest = {
  id: string;
  payload: {
    fullName?: string;
    contactNumber?: string;
    email?: string;
    dateOfBirth?: string;
    gender?: string;
    age?: number;
    nationality?: string;
    race?: string;

    tutoringLevels?: string[];
    preferredLocations?: string[];
    tutorType?: string[];
    yearsExperience?: number;
    highestEducation?: string;
    academicDetails?: string;
    teachingSummary?: string;
    studentResults?: string;
    sellingPoints?: string;
    agreeTerms?: boolean;
    agreeAssignmentInfo?: boolean;
    certificatesAndQualifications?: string[];
  } & Record<string, unknown>;
};

export type FetchTestimonialsRequest = {
  page: number;
  limit: number;
  name?: string;
  role?: string;
  rating?: number;
  sortBy?: string;
};

export type FetchTuitionAssignments = {
  title: string;
  assignmentNumber: string;
  address: string;
  duration: string;
  gradeId: string;
  tutorId: string;
  assignmentPrice: string;
};

export type FindMyTutorRequest = {
  fullName: string;
  contactNumber: string;
  confirmContactNumber: string;
  email: string;
  dateOfBirth: string;
  confirmDateOfBirth: string;
  gender: string;
  age: number;
  nationality: string;
  race: string;

  tutoringLevels: string[];
  preferredLocations: string[];
  tutorType: string[];
  yearsExperience: number;
  highestEducation: string;
  academicDetails: string;
  teachingSummary: string;
  studentResults: string;
  sellingPoints: string;
  agreeTerms: boolean;
  agreeAssignmentInfo: boolean;
  certificatesAndQualifications?: string[];
};

export type FetchLevelsRequest = {
  page?: number;
  limit?: number;
  sortBy?: string;
  title?: string;
  details?: string[];
  challenges?: string[];
  subjects?: string[];
};

export type UpdateLevelRequest = {
  id: string;
  title: string;
  description: string;
  details: string[];
  challenges: string[];
  subjects: string[];
};
