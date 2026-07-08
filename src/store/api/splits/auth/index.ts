import {
  ForgotPasswordRequest,
  UserLoginRequest,
  ResetPasswordRequest,
} from "@/types/request-types";
import {
  ForgotPasswordResponse,
  MeResponse,
  UpdatePasswordResponse,
  UserLoginResponse,
} from "@/types/response-types";
import { baseApi } from "../..";
import { Endpoints } from "../../endpoints";

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<UserLoginResponse, UserLoginRequest>({
      query: (payload) => {
        return {
          url: Endpoints.Login,
          method: "POST",
          body: payload,
        };
      },
    }),
    logout: build.mutation<void, void>({
      query: () => {
        return {
          url: Endpoints.Logout,
          method: "POST",
        };
      },
    }),
    me: build.query<MeResponse, void>({
      query: () => {
        return {
          url: Endpoints.Me,
          method: "GET",
        };
      },
    }),
    resetPassword: build.mutation<UpdatePasswordResponse, ResetPasswordRequest>(
      {
        query: ({ token, password }) => ({
          url: `${Endpoints.ResetPassword}?token=${encodeURIComponent(token)}`,
          method: "POST",
          body: { password },
        }),
      },
    ),
    forgotPassword: build.mutation<
      ForgotPasswordResponse,
      ForgotPasswordRequest
    >({
      query: (payload) => ({
        url: Endpoints.ForgotPassword,
        method: "POST",
        body: payload,
      }),
    }),
  }),

  overrideExisting: false,
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useLazyMeQuery,
  useResetPasswordMutation,
  useForgotPasswordMutation,
} = usersApi;
