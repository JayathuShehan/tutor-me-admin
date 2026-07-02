"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFetchBonusTransactionsQuery } from "@/store/api/splits/bonus-transactions";
import { BonusTransaction } from "@/types/response-types";
import { Eye, FileImage, Loader2, Paperclip } from "lucide-react";
import { useState } from "react";
import { AddSlipModal } from "./AddSlipModal";
import { ViewDetailsModal } from "./ViewDetailsModal";
import { ViewSlipModal } from "./ViewSlipModal";

export default function BonusTransactionsList() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [addSlipId, setAddSlipId] = useState<string | null>(null);
  const [viewSlipId, setViewSlipId] = useState<string | null>(null);

  const { data, isFetching } = useFetchBonusTransactionsQuery({ page, limit });

  const transactions: BonusTransaction[] = data?.results ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalResults = data?.totalResults ?? 0;

  return (
    <div className="max-w-full p-5 lg:p-6">
      <div className="mb-5 lg:mb-7">
        <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-800 dark:text-white/90">
          Bonus Transactions
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          A record of every batch of rewards marked as sent on the Referrals
          page.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        {isFetching ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No bonus transactions yet. They appear here when you mark rewards as
            sent on the Referrals page.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-white/5">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Received Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Transferred Admin Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Date &amp; Time
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Rewards
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      View Slip
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Add Slip
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      View Details
                    </th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow
                      key={tx.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      {/* Received email */}
                      <TableCell className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {tx.referrerName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {tx.referrerEmail}
                        </p>
                      </TableCell>

                      {/* Admin email */}
                      <TableCell className="px-4 py-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                          {tx.adminEmail}
                        </p>
                      </TableCell>

                      {/* Date & time */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(tx.createdAt).toLocaleTimeString()}
                        </p>
                      </TableCell>

                      {/* Reward count */}
                      <TableCell className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-7 min-w-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2">
                          {tx.rewardCount}
                        </span>
                      </TableCell>

                      {/* View slip */}
                      <TableCell className="px-4 py-3 text-center">
                        {tx.hasSlip ? (
                          <button
                            type="button"
                            title="View slip"
                            onClick={() => setViewSlipId(tx.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 transition"
                          >
                            <FileImage className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">
                            —
                          </span>
                        )}
                      </TableCell>

                      {/* Add slip */}
                      <TableCell className="px-4 py-3 text-center">
                        <button
                          type="button"
                          title={tx.hasSlip ? "Replace slip" : "Add slip"}
                          onClick={() => setAddSlipId(tx.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                      </TableCell>

                      {/* View details */}
                      <TableCell className="px-4 py-3 text-center">
                        <button
                          type="button"
                          title="View details"
                          onClick={() => setDetailsId(tx.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        >
                          <Eye className="w-4 h-4" />
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
                  {totalResults} transaction{totalResults !== 1 ? "s" : ""}
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

      {detailsId && (
        <ViewDetailsModal
          transactionId={detailsId}
          onClose={() => setDetailsId(null)}
        />
      )}
      {addSlipId && (
        <AddSlipModal
          transactionId={addSlipId}
          onClose={() => setAddSlipId(null)}
        />
      )}
      {viewSlipId && (
        <ViewSlipModal
          transactionId={viewSlipId}
          onClose={() => setViewSlipId(null)}
        />
      )}
    </div>
  );
}
