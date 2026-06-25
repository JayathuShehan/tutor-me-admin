/* eslint-disable @typescript-eslint/no-unused-vars */
import { CreateUserSchema } from "@/app/(admin)/users/all-users/components/add-user/schema";
import {
  FetchUserRequest,
  UpdatePasswordRequest,
  UpdateUserRequest,
  UpdateUserStatusRequest,
} from "@/types/request-types";
import {
  PaginatedResponse,
  UpdatePasswordResponse,
  Users,
} from "@/types/response-types";
import { baseApi } from "../..";
import { Endpoints } from "../../endpoints";

export const UsersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    fetchUsers: build.query<PaginatedResponse<Users>, FetchUserRequest>({
      query: (payload) => {
        const { userId, ...rest } = payload;
        return {
          url: Endpoints.Users,
          method: "GET",
          params: rest,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: "Users" as const,
                id,
              })),
              { type: "Users" as const, id: "LIST" },
            ]
          : [{ type: "Users" as const, id: "LIST" }],
    }),

    fetchUserById: build.query<Users, string | number>({
      query: (id) => ({
        url: `${Endpoints.Users}/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
      ],
    }),

    createUser: build.mutation<Users, CreateUserSchema>({
      query: (payload) => {
        return {
          url: Endpoints.Users,
          method: "POST",
          body: payload,
        };
      },
      invalidatesTags: ["Users"],
    }),

    updateUser: build.mutation<Users, UpdateUserRequest>({
      query: ({ id, ...payload }) => {
        return {
          url: `${Endpoints.Users}/${id}`,
          method: "PATCH",
          body: payload,
        };
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
        "FindATutor",
      ],
    }),

    updateUserStatus: build.mutation<Users, UpdateUserStatusRequest>({
      query: ({ id, status, rejectionMessage }) => ({
        url: `${Endpoints.Users}/${id}`,
        method: "PATCH",
        body: {
          status,
          ...(rejectionMessage !== undefined ? { rejectionMessage } : {}),
        },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
        "FindATutor",
        "Dashboard",
      ],
    }),

    deleteUser: build.mutation<void, string>({
      query: (id) => ({
        url: `${Endpoints.Users}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
        "FindATutor",
        "Admins",
      ],
    }),

    sendUserTempPassword: build.mutation<void, string>({
      query: (id) => ({
        url: `${Endpoints.Users}/temp-password/${id}`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Users", id },
        "FindATutor",
      ],
    }),

    updateUserPassword: build.mutation<
      UpdatePasswordResponse,
      UpdatePasswordRequest
    >({
      query: ({ id, payload }) => ({
        url: `${Endpoints.ChangePassword}/${id}`,
        method: "PATCH",
        body: payload,
      }),
    }),

    sendUserReferralCode: build.mutation<void, string>({
      query: (id) => ({
        url: `${Endpoints.Users}/send-referral-code/${id}`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
      ],
    }),

    clearUserReferralCode: build.mutation<void, string>({
      query: (id) => ({
        url: `${Endpoints.ClearUserReferralCode}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
        "FindATutor",
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useFetchUsersQuery,
  useLazyFetchUsersQuery,
  useFetchUserByIdQuery,
  useLazyFetchUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
  useDeleteUserMutation,
  useSendUserTempPasswordMutation,
  useUpdateUserPasswordMutation,
  useSendUserReferralCodeMutation,
  useClearUserReferralCodeMutation,
} = UsersApi;
