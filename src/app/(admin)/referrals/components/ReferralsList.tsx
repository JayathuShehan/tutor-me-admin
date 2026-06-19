"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useFetchReferralsSummaryQuery } from "@/store/api/splits/referrals";
import { ReferralSummary } from "@/types/response-types";
import { RewardsModal } from "./RewardsModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ReferralsList() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const [selectedReferrer, setSelectedReferrer] =
    useState<ReferralSummary | null>(null);

  const { data, isFetching } = useFetchReferralsSummaryQuery({ page, limit });

  const referrals = data?.results ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalResults = data?.totalResults ?? 0;

  return (
    <div className="max-w-full p-5 lg:p-6">
      <div className="mb-5 lg:mb-7">
        <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-800 dark:text-white/90">
          Referrals
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of tutors who have referred others, their referral codes, and
          reward statuses.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        {isFetching ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No referrals found. Referral data will appear here once tutors start
            using referral codes.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-white/5">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Referrer Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Referral Code
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Total Referrals
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Pending Rewards
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow
                      key={referral.referrerTutorId}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {referral.referrerName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {referral.referrerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-100 tracking-wider bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {referral.referralCode}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2">
                          {referral.totalReferrals}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        {referral.pendingRewards > 0 ? (
                          <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2">
                            {referral.pendingRewards}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-semibold px-2">
                            0
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedReferrer(referral)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                          Manage Rewards
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500">
                  {totalResults} referrer{totalResults !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-xs text-gray-500">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedReferrer && (
        <RewardsModal
          referrer={selectedReferrer}
          onClose={() => setSelectedReferrer(null)}
        />
      )}
    </div>
  );
}
