import { env } from "@/configs/env";
import { handleForceLogout } from "@/utils/auth";
import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
  retry,
} from "@reduxjs/toolkit/query/react";
import { Endpoints } from "./endpoints";

type CustomError = {
  status: "TIMEOUT_ERROR" | "FETCH_ERROR" | number;
};

const staggeredBaseQuery = retry(
  fetchBaseQuery({
    baseUrl: env.urls.apiUrl,
    credentials: "include",
  }),
  {
    retryCondition: (
      error: unknown,
      baseQueryArgs: FetchArgs,
      { attempt }: { attempt: number },
    ) => {
      const err = error as FetchBaseQueryError | CustomError;
      if (attempt > 5) return false;

      return (
        err.status === "TIMEOUT_ERROR" ||
        err.status === "FETCH_ERROR" ||
        (typeof err.status === "number" &&
          (err.status === 429 || err.status > 500))
      );
    },
  },
);

const baseQueryWithAuth: BaseQueryFn<
  FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await staggeredBaseQuery(args, api, extraOptions);

  const requestUrl = typeof args?.url === "string" ? args.url : "";
  const shouldSkipAuthRecovery =
    requestUrl === Endpoints.Login ||
    requestUrl === Endpoints.Me ||
    requestUrl === Endpoints.ResetPassword ||
    requestUrl.startsWith(`${Endpoints.ResetPassword}?`);

  if (result.error?.status === 401 && !shouldSkipAuthRecovery) {
    console.log("Session expired or invalid. Forcing logout.");
    handleForceLogout();
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  tagTypes: [
    "Faqs",
    "Users",
    "RequestTutor",
    "Testimonials",
    "Grades",
    "Subjects",
    "Papers",
    "TuitionRates",
    "LevelAndExams",
    "TuitionAssignments",
    "Levels",
    "Blogs",
    "Tags",
    "Inquiries",
    "FindATutor",
    "Admins",
    "Dashboard",
    "Referrals",
    "BonusTransactions",
    "Referees",
  ],
  baseQuery: baseQueryWithAuth,
  endpoints: () => ({}),
});
