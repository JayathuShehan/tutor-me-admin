"use client";

import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { Lock, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  useFetchRewardsForReferrerQuery,
  useBatchUpdateRewardsMutation,
} from "@/store/api/splits/referrals";
import { ReferralSummary } from "@/types/response-types";

const MIN_BATCH_SIZE = 5;

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

  // Reset pending updates whenever the data or view changes
  useEffect(() => {
    setPendingUpdates({});
  }, [data, showAll]);

  const rewards = data?.results ?? [];

  const getEffectiveRewardSent = (rewardId: string, original: boolean) => {
    return rewardId in pendingUpdates ? pendingUpdates[rewardId] : original;
  };

  // Bug fix: pass effectiveSent (current displayed state), not reward.rewardSent
  // (original server state), so the toggle actually flips from the visible value.
  const handleToggle = (rewardId: string, effectiveCurrent: boolean, locked: boolean) => {
    if (locked) return;
    setPendingUpdates((prev) => ({
      ...prev,
      [rewardId]: !effectiveCurrent,
    }));
  };

  const selectableRewards = rewards.filter((r) => !r.lockedInBatch);
  const allSelectableSelected =
    selectableRewards.length > 0 &&
    selectableRewards.every((r) => getEffectiveRewardSent(r.id, r.rewardSent));
  const someSelectableSelected = selectableRewards.some((r) =>
    getEffectiveRewardSent(r.id, r.rewardSent),
  );

  const handleSelectAll = () => {
    if (allSelectableSelected) {
      // Deselect all: revert every selectable reward to its original server state
      setPendingUpdates((prev) => {
        const next = { ...prev };
        selectableRewards.forEach((r) => {
          delete next[r.id];
        });
        return next;
      });
    } else {
      // Select all: mark every selectable reward as sent
      setPendingUpdates((prev) => {
        const next = { ...prev };
        selectableRewards.forEach((r) => {
          next[r.id] = true;
        });
        return next;
      });
    }
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

    // Count how many rewards are being marked as sent in this batch
    const toBeSentCount = updates.filter((u) => u.rewardSent === true).length;
    if (toBeSentCount < MIN_BATCH_SIZE) {
      toast.error(
        `A reward batch requires at least ${MIN_BATCH_SIZE} referrals. You have selected ${toBeSentCount}.`,
      );
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

  const pendingUpdateEntries = Object.entries(pendingUpdates);
  const hasPendingChanges = pendingUpdateEntries.length > 0;
  const selectedToSendCount = pendingUpdateEntries.filter(
    ([, v]) => v === true,
  ).length;
  const belowMinimum = hasPendingChanges && selectedToSendCount < MIN_BATCH_SIZE;

  return createPortal(
    <div
      className="fixed inset-0 z-900000 flex items-center justify-center bg-black/50 px-4 backdrop-blur-[1px]"
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

        {/* Filter toggle + Select All */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded"
            />
            Show all (including sent rewards)
          </label>

          {selectableRewards.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                ref={(el) => {
                  if (el) {
                    el.indeterminate =
                      someSelectableSelected && !allSelectableSelected;
                  }
                }}
                checked={allSelectableSelected}
                onChange={handleSelectAll}
                className="rounded"
              />
              Select all ({selectableRewards.length})
            </label>
          )}
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
                const locked = reward.lockedInBatch === true;
                const effectiveSent = getEffectiveRewardSent(
                  rewardId,
                  reward.rewardSent,
                );
                const changed = rewardId in pendingUpdates;

                return (
                  <div
                    key={rewardId}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                      locked
                        ? "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 opacity-70"
                        : changed
                          ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {referred.fullName}
                        </p>
                        {locked && (
                          <Lock
                            className="w-3 h-3 shrink-0 text-gray-400"
                            aria-label="Locked — included in a saved batch"
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {referred.email}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Registered:{" "}
                        {new Date(referred.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Checkbox — non-interactive for locked rows */}
                    <div className="shrink-0">
                      {locked ? (
                        <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium select-none">
                          <input
                            type="checkbox"
                            checked
                            disabled
                            readOnly
                            className="rounded pointer-events-none"
                          />
                          Sent
                        </span>
                      ) : (
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={effectiveSent}
                            onChange={() =>
                              handleToggle(rewardId, effectiveSent, locked)
                            }
                            className="rounded"
                          />
                          <span
                            className={`inline-block w-14 ${
                              effectiveSent
                                ? "text-green-600 dark:text-green-400 font-medium"
                                : "text-gray-500"
                            }`}
                          >
                            {effectiveSent ? "Sent" : "Pending"}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="space-y-0.5">
            {hasPendingChanges ? (
              <>
                <span className="text-xs text-gray-500">
                  {selectedToSendCount} selected to send
                </span>
                {belowMinimum && (
                  <p className="text-xs text-red-500 font-medium">
                    Minimum {MIN_BATCH_SIZE} required to save a batch
                  </p>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">No unsaved changes</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasPendingChanges || belowMinimum}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
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
