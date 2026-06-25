"use client";

import { Button } from "@/components/ui/button/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteRefereeMutation } from "@/store/api/splits/referees";
import { useLazyFetchRewardsForReferrerQuery } from "@/store/api/splits/referrals";
import { getErrorInApiResult } from "@/utils/api";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

type Step = "idle" | "checking" | "warn" | "confirm";

export function DeleteReferee({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [pendingCount, setPendingCount] = useState(0);

  const [deleteReferee, { isLoading }] = useDeleteRefereeMutation();
  const [fetchRewards] = useLazyFetchRewardsForReferrerQuery();

  const close = () => {
    setOpen(false);
    setStep("idle");
    setPendingCount(0);
  };

  const handleTriggerClick = async () => {
    setStep("checking");
    setOpen(true);
    try {
      const result = await fetchRewards(
        { tutorId: id, unsentOnly: true },
        true,
      ).unwrap();
      const count = result.results?.length ?? 0;
      if (count > 0) {
        setPendingCount(count);
        setStep("warn");
      } else {
        setStep("confirm");
      }
    } catch {
      setStep("confirm");
    }
  };

  const handleDelete = async () => {
    const result = await deleteReferee(id);
    const error = getErrorInApiResult(result);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Referee deleted successfully");
    close();
  };

  return (
    <>
      <button
        type="button"
        title="Delete referee"
        onClick={handleTriggerClick}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-[460px] bg-white dark:bg-gray-800 dark:text-white/90">
          <DialogHeader>
            {step === "checking" ? (
              <DialogTitle>Checking pending rewards…</DialogTitle>
            ) : step === "warn" ? (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <DialogTitle className="text-base pt-1">
                  Pending Rewards — Action Required
                </DialogTitle>
              </div>
            ) : (
              <DialogTitle>Delete Referee</DialogTitle>
            )}
          </DialogHeader>

          {step === "checking" && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}

          {step === "warn" && (
            <>
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    {pendingCount} pending reward
                    {pendingCount !== 1 ? "s" : ""} tied to{" "}
                    <strong>{name}</strong>
                  </p>
                  <p className="mt-1 text-amber-700 dark:text-amber-400">
                    This referee cannot be deleted while pending rewards remain.
                    Please go to the <strong>Referrals</strong> page and settle
                    all pending rewards first.
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Deletion will be available once all pending rewards reach 0.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={close}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "confirm" && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to delete <strong>{name}</strong>? This
                action cannot be undone.
              </p>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={close}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  className="bg-red-600 text-white hover:bg-red-500"
                  isLoading={isLoading}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
