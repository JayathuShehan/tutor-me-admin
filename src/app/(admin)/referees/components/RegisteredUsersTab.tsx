"use client";

import DataTable, { Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TABLE_CONFIG } from "@/configs/table";
import {
  useFetchReferralsSummaryQuery,
  useLazyFetchRewardsForReferrerQuery,
} from "@/store/api/splits/referrals";
import {
  useClearUserReferralCodeMutation,
  useFetchUsersQuery,
  useUpdateUserMutation,
} from "@/store/api/splits/users";
import { Users } from "@/types/response-types";
import { getErrorInApiResult } from "@/utils/api";
import {
  accountNumberInputRegisterOptions,
  bankNameInputRegisterOptions,
} from "@/utils/form-normalizers";
import { AlertTriangle, Copy, Loader2, SquarePen, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { ViewUserAsReferee } from "./ViewUserAsReferee";

// ── Helpers ──────────────────────────────────────────────────────────────────

function referrerId(user: Users): string {
  // Tutor rewards are keyed by the Tutor document's _id (tutorId),
  // admin rewards are keyed by the User document's _id.
  return user.role === "tutor" && user.tutorId ? user.tutorId : user.id;
}

// ── Edit dialog (bank details editable; everything else read-only) ────────────

type BankFormValues = {
  accountName: string;
  accountNumber: string;
  bankName: string;
};

function EditBankDetails({ user }: { user: Users }) {
  const [open, setOpen] = useState(false);
  const [updateUser, { isLoading }] = useUpdateUserMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState,
  } = useForm<BankFormValues>({
    mode: "onBlur",
    defaultValues: {
      accountName: user.accountName ?? "",
      accountNumber: user.accountNumber ?? "",
      bankName: user.bankName ?? "",
    },
  });

  const handleOpen = () => {
    reset({
      accountName: user.accountName ?? "",
      accountNumber: user.accountNumber ?? "",
      bankName: user.bankName ?? "",
    });
    setOpen(true);
  };

  const onSubmit = async (data: BankFormValues) => {
    const result = await updateUser({
      id: user.id,
      accountName: data.accountName.trim() || null,
      accountNumber: data.accountNumber.trim() || null,
      bankName: data.bankName.trim() || null,
    });
    const error = getErrorInApiResult(result);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Bank details updated");
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        title="Edit bank details"
        onClick={handleOpen}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
      >
        <SquarePen className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-[420px] bg-white dark:bg-gray-800 dark:text-white/90 p-0 overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0">
          <DialogHeader className="shrink-0 bg-white dark:bg-gray-800 px-6 py-4 border-b">
            <DialogTitle>Edit Bank Details</DialogTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {user.name} · <span className="capitalize">{user.role}</span>
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  placeholder="e.g. Nimal Perera"
                  {...register("accountName", {
                    validate: (v) =>
                      !v ||
                      /^[A-Za-z' ()-]+$/.test(v) ||
                      "Only letters, spaces, hyphens, apostrophes, and parentheses are allowed",
                    ...bankNameInputRegisterOptions(
                      "accountName",
                      setValue,
                      formState.isSubmitted,
                    ),
                  })}
                />
                {formState.errors.accountName && (
                  <p className="text-sm text-red-500">
                    {formState.errors.accountName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="e.g. 0012345678"
                  inputMode="numeric"
                  {...register("accountNumber", {
                    validate: (v) =>
                      !v ||
                      /^[0-9]+$/.test(v) ||
                      "Account number must contain only digits",
                    ...accountNumberInputRegisterOptions(
                      "accountNumber",
                      setValue,
                      formState.isSubmitted,
                    ),
                  })}
                />
                {formState.errors.accountNumber && (
                  <p className="text-sm text-red-500">
                    {formState.errors.accountNumber.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  placeholder="e.g. Commercial Bank of Ceylon"
                  {...register("bankName", {
                    validate: (v) =>
                      !v ||
                      /^[A-Za-z' ()-]+$/.test(v) ||
                      "Only letters, spaces, hyphens, apostrophes, and parentheses are allowed",
                    ...bankNameInputRegisterOptions(
                      "bankName",
                      setValue,
                      formState.isSubmitted,
                    ),
                  })}
                />
                {formState.errors.bankName && (
                  <p className="text-sm text-red-500">
                    {formState.errors.bankName.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="shrink-0 bg-white dark:bg-gray-800 px-6 py-4 border-t">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="bg-blue-700 text-white hover:bg-blue-500"
                isLoading={isLoading}
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Delete (revoke referral code) dialog ─────────────────────────────────────

type DeleteStep = "idle" | "checking" | "warn" | "confirm";

function RevokeReferralCode({
  user,
  pendingRewards,
}: {
  user: Users;
  pendingRewards: number;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DeleteStep>("idle");

  const [clearCode, { isLoading }] = useClearUserReferralCodeMutation();
  const [fetchRewards] = useLazyFetchRewardsForReferrerQuery();

  const close = () => {
    setOpen(false);
    setStep("idle");
  };

  const handleTriggerClick = async () => {
    if (pendingRewards > 0) {
      setStep("warn");
      setOpen(true);
      return;
    }
    setStep("checking");
    setOpen(true);
    try {
      const rid = referrerId(user);
      const result = await fetchRewards(
        { tutorId: rid, unsentOnly: true },
        true,
      ).unwrap();
      setStep((result.results?.length ?? 0) > 0 ? "warn" : "confirm");
    } catch {
      setStep("confirm");
    }
  };

  const handleRevoke = async () => {
    const result = await clearCode(user.id);
    const error = getErrorInApiResult(result);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(
      `Referral code revoked for ${user.name}. Send Code is now available again.`,
    );
    close();
  };

  return (
    <>
      <button
        type="button"
        title="Revoke referral code"
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
              <DialogTitle>Revoke Referral Code</DialogTitle>
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
                    Pending rewards tied to <strong>{user.name}</strong>
                  </p>
                  <p className="mt-1 text-amber-700 dark:text-amber-400">
                    This referral code cannot be revoked while pending rewards
                    remain. Please go to the <strong>Referrals</strong> page
                    and settle all pending rewards first.
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Revocation will be available once all pending rewards reach 0.
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
                Are you sure you want to revoke the referral code for{" "}
                <strong>{user.name}</strong>? The Send Code option will become
                available again in the Users page. This action cannot be undone.
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
                  onClick={handleRevoke}
                >
                  Revoke Code
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main tab component ────────────────────────────────────────────────────────

export function RegisteredUsersTab() {
  const [page, setPage] = useState(TABLE_CONFIG.DEFAULT_PAGE);
  const [limit, setLimit] = useState(TABLE_CONFIG.DEFAULT_LIMIT);

  const { data, isFetching } = useFetchUsersQuery({
    page,
    limit,
    roles: "tutor,admin",
    hasReferralCode: "true",
    sortBy: "name:asc",
  });

  // refetchOnMountOrArgChange ensures counts are always fresh when the tab is
  // opened, even if a tutor registered from the public form (no admin mutation
  // fires to invalidate the cache in that case).
  const { data: summariesData } = useFetchReferralsSummaryQuery(
    { page: 1, limit: 1000 },
    { refetchOnMountOrArgChange: true },
  );

  const { countMap, pendingMap } = useMemo(() => {
    const countMap = new Map<string, number>();
    const pendingMap = new Map<string, number>();
    summariesData?.results.forEach((s) => {
      countMap.set(s.referrerTutorId, s.totalReferrals);
      pendingMap.set(s.referrerTutorId, s.pendingRewards);
    });
    return { countMap, pendingMap };
  }, [summariesData]);

  const getReferralCount = (user: Users) =>
    countMap.get(referrerId(user)) ?? 0;

  const getPendingRewards = (user: Users) =>
    pendingMap.get(referrerId(user)) ?? 0;

  const users = data?.results ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalResults = data?.totalResults ?? 0;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast.success("Referral code copied!");
    });
  };

  const columns: Column<Users>[] = [
    {
      key: "name",
      header: "Name",
      className:
        "min-w-[150px] max-w-[200px] truncate overflow-hidden sticky left-0 z-20 bg-white dark:bg-gray-900",
      render: (row) => (
        <span
          title={row.name}
          className="block truncate text-sm font-medium text-gray-900 dark:text-white"
          style={{ width: "inherit" }}
        >
          {row.name}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      className: "min-w-[180px] max-w-[220px] truncate overflow-hidden",
      render: (row) => (
        <span
          title={row.email}
          className="block truncate text-xs text-gray-600 dark:text-gray-400"
        >
          {row.email}
        </span>
      ),
    },
    {
      key: "contactNumber",
      header: "Contact Number",
      className: "min-w-[130px] max-w-[160px] whitespace-nowrap",
      render: (row) => (
        <span className="text-xs text-gray-700 dark:text-gray-300">
          {row.phoneNumber || "—"}
        </span>
      ),
    },
    {
      key: "gender",
      header: "Gender",
      className: "min-w-[80px] max-w-[100px] whitespace-nowrap",
      render: (row) => (
        <span className="text-xs capitalize text-gray-700 dark:text-gray-300">
          {row.gender || "—"}
        </span>
      ),
    },
    {
      key: "referralCode",
      header: "Referral Code",
      className: "min-w-[140px] max-w-[180px]",
      render: (row) =>
        row.referralCode ? (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm tracking-wider text-gray-800 dark:text-gray-100">
              {row.referralCode}
            </span>
            <button
              type="button"
              title="Copy referral code"
              onClick={() => copyCode(row.referralCode!)}
              className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span className="italic text-sm text-gray-400">No code</span>
        ),
    },
    {
      key: "referralCount",
      header: "Referral Count",
      align: "center",
      className: "min-w-[110px] max-w-[130px]",
      render: (row) => (
        <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2">
          {getReferralCount(row)}
        </span>
      ),
    },
    {
      key: "actions",
      header: <div className="text-center w-full">Actions</div>,
      align: "center",
      className:
        "min-w-[120px] max-w-[120px] sticky right-0 z-20 bg-white dark:bg-gray-900",
      render: (row) => (
        <div className="flex justify-center items-center gap-2">
          <ViewUserAsReferee user={row} referralCount={getReferralCount(row)} />
          <EditBankDetails user={row} />
          <RevokeReferralCode user={row} pendingRewards={getPendingRewards(row)} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      totalResults={totalResults}
      limit={limit}
      onLimitChange={(l) => {
        setLimit(l);
        setPage(TABLE_CONFIG.DEFAULT_PAGE);
      }}
      isLoading={isFetching}
      emptyMessage="No registered users with referral codes found."
      preserveDataOrder
    />
  );
}
