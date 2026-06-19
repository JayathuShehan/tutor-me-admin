import {
  PaginatedResponse,
  ReferralReward,
  ReferralSummary,
} from "@/types/response-types";
import { baseApi } from "../..";
import { Endpoints } from "../../endpoints";

export const ReferralsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    fetchReferralsSummary: build.query<
      PaginatedResponse<ReferralSummary>,
      { page?: number; limit?: number }
    >({
      query: (params) => ({
        url: Endpoints.Referrals,
        method: "GET",
        params,
      }),
      providesTags: ["Referrals"],
    }),

    fetchRewardsForReferrer: build.query<
      { results: ReferralReward[] },
      { tutorId: string; unsentOnly?: boolean }
    >({
      query: ({ tutorId, unsentOnly = true }) => ({
        url: `${Endpoints.Referrals}/${tutorId}/rewards`,
        method: "GET",
        params: { unsentOnly: String(unsentOnly) },
      }),
      providesTags: ["Referrals"],
    }),

    batchUpdateRewards: build.mutation<
      void,
      {
        updates: { id: string; rewardSent: boolean }[];
        referrerTutorId?: string;
      }
    >({
      query: (payload) => ({
        url: `${Endpoints.Referrals}/rewards/batch`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["Referrals", "BonusTransactions"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useFetchReferralsSummaryQuery,
  useLazyFetchReferralsSummaryQuery,
  useFetchRewardsForReferrerQuery,
  useLazyFetchRewardsForReferrerQuery,
  useBatchUpdateRewardsMutation,
} = ReferralsApi;
