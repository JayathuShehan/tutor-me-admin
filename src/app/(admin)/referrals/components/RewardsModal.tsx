"use client";

import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  useFetchRewardsForReferrerQuery,
  useBatchUpdateRewardsMutation,
} from "@/store/api/splits/referrals";
import { ReferralSummary } from "@/types/response-types";

interface RewardsModalProps {
  referrer: ReferralSummary;
  onClose: () => void;
}

export function RewardsModal({ referrer, onClose }: RewardsModalProps) {
  const [showAll, setShowAll] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, boolean>>(
    {},
  );

  const { data, isFetching, refetch } = useFetchRewardsForReferrerQuery({
    tutorId: referrer.referrerTutorId,
    unsentOnly: !showAll,
  });

  const [batchUpdateRewards, { isLoading: isSaving }] =
    useBatchUpdateRewardsMutation();

  // Reset pending updates when data changes
  useEffect(() => {
    setPendingUpdates({});
  }, [data, showAll]);

  const rewards = data?.results ?? [];

  const handleToggle = (rewardId: string, current: boolean) => {
    setPendingUpdates((prev) => ({
      ...prev,
      [rewardId]: !current,
    }));
  };

  const getEffectiveRewardSent = (rewardId: string, original: boolean) => {
    return rewardId in pendingUpdates ? pendingUpdates[rewardId] : original;
  };

  const handleSave = async () => {
    const updates = Object.entries(pendingUpdates).map(([id, rewardSent]) => ({
      id,
      rewardSent,
    }));

    if (updates.length === 0) {
      toast("No changes to save.");
      return;
    }

    const result = await batchUpdateRewards({
      updates,
      referrerTutorId: referrer.referrerTutorId,
    });
    if ("error" in result) {
      toast.error("Failed to save changes.");
      return;
    }

    toast.success("Reward statuses updated.");
    setPendingUpdates({});
    refetch();
  };

  const hasPendingChanges = Object.keys(pendingUpdates).length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[900000] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Manage Rewards
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {referrer.referrerName} · Code:{" "}
              <span className="font-mono font-medium">
                {referrer.referralCode}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter toggle */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded"
            />
            Show all (including sent rewards)
          </label>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {isFetching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : rewards.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              {showAll ? "No referrals found." : "No pending rewards."}
            </p>
          ) : (
            <div className="space-y-2">
              {rewards.map((reward) => {
                const referred = reward.referredTutorId as {
                  id?: string;
                  _id?: string;
                  fullName: string;
                  email: string;
                  createdAt: string;
                };
                const rewardId = reward.id;
                const effectiveSent = getEffectiveRewardSent(
                  rewardId,
                  reward.rewardSent,
                );
                const changed = rewardId in pendingUpdates;

                return (
                  <div
                    key={rewardId}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                      changed
                        ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {referred.fullName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {referred.email}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Registered:{" "}
                        {new Date(referred.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={effectiveSent}
                        onChange={() =>
                          handleToggle(rewardId, reward.rewardSent)
                        }
                        className="rounded"
                      />
                      <span
                        className={
                          effectiveSent
                            ? "text-green-600 dark:text-green-400 font-medium"
                            : "text-gray-500"
                        }
                      >
                        {effectiveSent ? "Sent" : "Pending"}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <span className="text-xs text-gray-400">
            {hasPendingChanges
              ? `${Object.keys(pendingUpdates).length} unsaved change(s)`
              : "No unsaved changes"}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasPendingChanges}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 transition flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
