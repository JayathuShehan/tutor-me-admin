import { BonusTransaction, PaginatedResponse } from "@/types/response-types";
import { baseApi } from "../..";
import { Endpoints } from "../../endpoints";

export const BonusTransactionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    fetchBonusTransactions: build.query<
      PaginatedResponse<BonusTransaction>,
      { page?: number; limit?: number }
    >({
      query: (params) => ({
        url: Endpoints.BonusTransactions,
        method: "GET",
        params,
      }),
      providesTags: ["BonusTransactions"],
    }),

    fetchBonusTransactionById: build.query<BonusTransaction, string>({
      query: (id) => ({
        url: `${Endpoints.BonusTransactions}/${id}`,
        method: "GET",
      }),
      providesTags: ["BonusTransactions"],
    }),

    uploadSlip: build.mutation<
      void,
      { id: string; data: string; fileName: string; mimeType: string }
    >({
      query: ({ id, ...body }) => ({
        url: `${Endpoints.BonusTransactions}/${id}/slip`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["BonusTransactions"],
    }),

    fetchSlip: build.query<
      { data: string; fileName: string; mimeType: string },
      string
    >({
      query: (id) => ({
        url: `${Endpoints.BonusTransactions}/${id}/slip`,
        method: "GET",
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useFetchBonusTransactionsQuery,
  useFetchBonusTransactionByIdQuery,
  useUploadSlipMutation,
  useLazyFetchSlipQuery,
} = BonusTransactionsApi;
