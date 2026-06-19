import {
  PaginatedResponse,
  Referee,
  RefereeEmailAvailabilityResponse,
} from "@/types/response-types";
import { baseApi } from "../..";
import { Endpoints } from "../../endpoints";

export const RefereesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    fetchReferees: build.query<
      PaginatedResponse<Referee>,
      { page?: number; limit?: number; search?: string }
    >({
      query: (params) => ({
        url: Endpoints.Referees,
        method: "GET",
        params,
      }),
      providesTags: ["Referees"],
    }),

    getRefereeEmailAvailability: build.query<
      RefereeEmailAvailabilityResponse,
      string
    >({
      query: (email) => ({
        url: `${Endpoints.RefereeEmailAvailability}?email=${encodeURIComponent(email)}`,
        method: "GET",
      }),
    }),

    createReferee: build.mutation<
      Referee,
      {
        name: string;
        email: string;
        contactNumber: string;
        gender: string;
        avatar?: string;
      }
    >({
      query: (payload) => ({
        url: Endpoints.Referees,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Referees"],
    }),

    updateReferee: build.mutation<
      Referee,
      {
        id: string;
        name?: string;
        email?: string;
        contactNumber?: string;
        gender?: string;
        avatar?: string;
      }
    >({
      query: ({ id, ...payload }) => ({
        url: `${Endpoints.Referees}/${id}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["Referees"],
    }),

    deleteReferee: build.mutation<void, string>({
      query: (id) => ({
        url: `${Endpoints.Referees}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Referees"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useFetchRefereesQuery,
  useLazyGetRefereeEmailAvailabilityQuery,
  useCreateRefereeMutation,
  useUpdateRefereeMutation,
  useDeleteRefereeMutation,
} = RefereesApi;
