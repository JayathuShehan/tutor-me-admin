"use client";

import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { useFetchBonusTransactionByIdQuery } from "@/store/api/splits/bonus-transactions";
import { BonusRewardDetail } from "@/types/response-types";

interface Props {
  transactionId: string;
  onClose: () => void;
}

export function ViewDetailsModal({ transactionId, onClose }: Props) {
  const { data, isFetching } = useFetchBonusTransactionByIdQuery(transactionId);

  return createPortal(
    <div
      className="fixed inset-0 z-[900000] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Transaction Details
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {isFetching || !data ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Received By
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {data.referrerName}
                  </p>
                  <p className="text-gray-500 text-xs">{data.referrerEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Transferred By (Admin)
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-xs break-all">
                    {data.adminEmail}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Date &amp; Time
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-xs">
                    {new Date(data.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Reward Count
                  </p>
                  <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2">
                    {data.rewardCount}
                  </span>
                </div>
              </div>

              {/* Rewarded tutors */}
              {Array.isArray(data.rewardIds) && data.rewardIds.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Referred Tutors Included
                  </p>
                  <div className="space-y-2">
                    {(data.rewardIds as BonusRewardDetail[]).map((reward) => (
                      <div
                        key={reward.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {reward.referredTutorId?.fullName ?? "—"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {reward.referredTutorId?.email ?? "—"}
                          </p>
                        </div>
                        <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                          Sent
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
