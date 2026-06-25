/* eslint-disable @typescript-eslint/no-unused-vars */
import { AddTutorFormValues } from "@/app/(admin)/tutors/components/add-tutor/schema";
import { UpdateTutorSchema } from "@/app/(admin)/tutors/components/edit-tutor/schema";
import { FetchTutorsRequest } from "@/types/request-types";
import {
  PaginatedResponse,
  Tutor,
  TutorEmailAvailabilityResponse,
} from "@/types/response-types";
import { baseApi } from "../..";
import { Endpoints } from "../../endpoints";

export const TutorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    fetchTutors: build.query<PaginatedResponse<Tutor>, FetchTutorsRequest>({
      query: (payload) => {
        const { tutorId, ...rest } = payload;
        return {
          url: Endpoints.FindATutor,
          method: "GET",
          params: rest,
        };
      },
      providesTags: ["FindATutor"],
    }),

    fetchTutorById: build.query<Tutor, string>({
      query: (id) => ({
        url: `${Endpoints.FindATutor}/${id}`,
        method: "GET",
      }),
      providesTags: ["FindATutor"],
    }),

    getTutorEmailAvailability: build.query<
      TutorEmailAvailabilityResponse,
      string
    >({
      query: (email) => ({
        url: `${Endpoints.FindATutorEmailAvailability}?email=${encodeURIComponent(email)}`,
        method: "GET",
      }),
    }),

    createTutor: build.mutation<
      Tutor,
      Omit<AddTutorFormValues, "confirmPassword">
    >({
      query: (payload) => {
        return {
          url: Endpoints.FindATutor,
          method: "POST",
          body: payload,
        };
      },
      invalidatesTags: ["FindATutor", "Users", "Dashboard"],
    }),

    updateTutor: build.mutation<
      Tutor,
      { id: string } & Omit<UpdateTutorSchema, "email">
    >({
      query: ({ id, ...payload }) => {
        return {
          url: `${Endpoints.FindATutor}/${id}`,
          method: "PATCH",
          body: payload,
        };
      },
      invalidatesTags: ["FindATutor", "Users", "Dashboard"],
    }),

    updateTutorStatus: build.mutation<
      Tutor,
      {
        id: string;
        status: string;
        adminId?: string | null;
        rejectionMessage?: string;
      }
    >({
      query: ({ id, status, adminId, rejectionMessage }) => ({
        url: `${Endpoints.FindATutor}/${id}`,
        method: "PATCH",
        body: {
          status,
          ...(adminId ? { adminId } : {}),
          ...(rejectionMessage !== undefined ? { rejectionMessage } : {}),
        },
      }),
      // "Referrals" must be invalidated because approval/rejection changes
      // which tutors count toward pendingRewards in the summary aggregation.
      invalidatesTags: ["FindATutor", "Users", "Dashboard", "Referrals"],
    }),

    deleteTutor: build.mutation<void, string>({
      query: (id) => ({
        url: `${Endpoints.FindATutor}/${id}`,
        method: "DELETE",
      }),
      // "Referrals" must be invalidated because deleting a referred tutor
      // may reduce totalReferrals in the summary aggregation.
      invalidatesTags: ["FindATutor", "Users", "Dashboard", "Referrals"],
    }),

    sendTempPasswordTutor: build.mutation<void, string>({
      query: (id) => ({
        url: `${Endpoints.FindATutor}/temp-password/${id}`,
        method: "POST",
      }),
      invalidatesTags: ["FindATutor", "Users"],
    }),

    sendReferralCode: build.mutation<void, string>({
      query: (id) => ({
        url: `${Endpoints.FindATutor}/send-referral-code/${id}`,
        method: "POST",
      }),
      invalidatesTags: ["FindATutor", "Users"],
    }),

    fetchMatchingTutors: build.query<
      { count: number; tutors: Tutor[] },
      { subjects: string[]; tutorType?: string }
    >({
      query: (body) => ({
        url: `${Endpoints.FindATutor}/match-by-subjects`,
        method: "POST",
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useFetchTutorsQuery,
  useLazyFetchTutorsQuery,
  useFetchTutorByIdQuery,
  useLazyFetchTutorByIdQuery,
  useLazyGetTutorEmailAvailabilityQuery,
  useCreateTutorMutation,
  useUpdateTutorMutation,
  useUpdateTutorStatusMutation,
  useDeleteTutorMutation,
  useSendTempPasswordTutorMutation,
  useSendReferralCodeMutation,
  useFetchMatchingTutorsQuery,
} = TutorsApi;
