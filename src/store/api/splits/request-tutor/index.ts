import {
  FetchRequestForTutor,
  UpdateTutorRequestsRequest,
} from "@/types/request-types";
import {
  GenerateTutorMatchReportResponse,
  PaginatedResponse,
  RequestTutors,
} from "@/types/response-types";
import { baseApi } from "../..";
import { Endpoints } from "../../endpoints";

export const RequestTutorApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    fetchRequestForTutors: build.query<
      PaginatedResponse<RequestTutors>,
      FetchRequestForTutor
    >({
      query: (payload) => ({
        url: Endpoints.RequestTutor,
        method: "GET",
        params: payload,
      }),
      providesTags: [{ type: "RequestTutor", id: "LIST" }],
    }),

    fetchRequestForTutorsById: build.query<RequestTutors, string>({
      query: (id) => ({
        url: `${Endpoints.RequestTutor}/${id}`,
        method: "GET",
      }),
      providesTags: ["RequestTutor"],
    }),

    deleteRequestForTutor: build.mutation<void, string>({
      query: (id) => ({
        url: `${Endpoints.RequestTutor}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "RequestTutor", id: "LIST" }],
    }),

    updateStatus: build.mutation<RequestTutors, UpdateTutorRequestsRequest>({
      query: ({ requestId, ...body }) => ({
        url: `${Endpoints.RequestTutor}/status/${requestId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["RequestTutor"],
    }),

    updateAssignedTutor: build.mutation<
      void,
      {
        requestId: string;
        tutorBlockId?: string;
        assignedTutor: string | string[];
      }
    >({
      query: ({ requestId, tutorBlockId, assignedTutor }) => ({
        url: `${Endpoints.RequestTutor}/assigned-tutor/${requestId}`,
        method: "PATCH",
        body: { ...(tutorBlockId ? { tutorBlockId } : {}), assignedTutor },
      }),
      invalidatesTags: [{ type: "RequestTutor", id: "LIST" }],
    }),

    generateTutorMatchReport: build.mutation<
      GenerateTutorMatchReportResponse,
      { requestId: string }
    >({
      query: ({ requestId }) => ({
        url: `${Endpoints.RequestTutor}/match-tutors/${requestId}`,
        method: "POST",
      }),
      invalidatesTags: ["RequestTutor"],
    }),

    // FR-5: renders the identical report as a PDF for the admin to download. No email is sent.
    downloadTutorMatchReportPdf: build.mutation<Blob, { requestId: string }>({
      query: ({ requestId }) => ({
        url: `${Endpoints.RequestTutor}/match-tutors/${requestId}/pdf`,
        method: "GET",
        // A non-ok response is still JSON ({ code, message } from the API's error handler) —
        // only parse as a Blob on success, otherwise the real error message gets swallowed as
        // an opaque Blob and getApiErrorMessage() has nothing to read.
        responseHandler: async (response: Response) => {
          if (!response.ok) {
            try {
              return await response.json();
            } catch {
              return { message: await response.text().catch(() => undefined) };
            }
          }
          return response.blob();
        },
      }),
    }),

    sendTelegramOutreach: build.mutation<unknown, { requestId: string }>({
      query: ({ requestId }) => ({
        url: `${Endpoints.RequestTutor}/${requestId}/send-telegram-outreach`,
        method: "POST",
      }),
      invalidatesTags: ["RequestTutor"],
    }),

    unassignTutor: build.mutation<
      void,
      { requestId: string; tutorBlockIds: string[]; unassignReason?: string }
    >({
      query: ({ requestId, ...body }) => ({
        url: `${Endpoints.RequestTutor}/unassign/${requestId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "RequestTutor", id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useFetchRequestForTutorsQuery,
  useLazyFetchRequestForTutorsQuery,
  useFetchRequestForTutorsByIdQuery,
  useLazyFetchRequestForTutorsByIdQuery,
  useDeleteRequestForTutorMutation,
  useUpdateStatusMutation,
  useUpdateAssignedTutorMutation,
  useGenerateTutorMatchReportMutation,
  useDownloadTutorMatchReportPdfMutation,
  useSendTelegramOutreachMutation,
  useUnassignTutorMutation,
} = RequestTutorApi;
