/* eslint-disable @next/next/no-img-element */
"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Users } from "@/types/response-types";
import { Copy, Eye, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface Props {
  user: Users;
  referralCount: number;
}

function CopyableField({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className: string;
}) {
  const v = String(value ?? "").trim();
  const canCopy = Boolean(v);

  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(v);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!canCopy}
      className={`${className} group flex items-center justify-between gap-3 text-left ${
        canCopy ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{v || "—"}</span>
      {canCopy && (
        <>
          <span className="shrink-0 text-gray-400 opacity-0 duration-300 group-hover:opacity-100">
            ( Click to copy )
          </span>
          <Copy className="h-4 w-4 shrink-0 text-gray-700 opacity-50 duration-300 group-hover:opacity-100 dark:text-gray-300" />
        </>
      )}
    </button>
  );
}

export function ViewUserAsReferee({ user, referralCount }: Props) {
  const [open, setOpen] = useState(false);

  const fieldClass =
    "w-full rounded-md border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-700 dark:text-white/90";

  const genderLabel = user.gender
    ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1)
    : "—";

  const roleLabel = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "—";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Eye
          cursor="pointer"
          className="text-blue-500 hover:text-blue-700"
        />
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[625px] bg-white z-50 dark:bg-gray-800 dark:text-white/90 p-0 overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0"
      >
        <DialogHeader className="shrink-0 flex-row items-start justify-between bg-white dark:bg-gray-800 px-6 py-4 border-b z-40">
          <div className="space-y-2 text-left">
            <DialogTitle>Details</DialogTitle>
            <DialogDescription>Registered User — Referee Details</DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
          <div className="grid gap-4">
            {/* Profile picture */}
            <div className="grid gap-3">
              <Label>Profile Picture</Label>
              <div className="w-full flex justify-center">
                <div className="w-35 h-35 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
                  <img
                    src={user.avatar || "/images/user/user.png"}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Name</Label>
              <CopyableField label="Name" value={user.name} className={cn(fieldClass)} />
            </div>

            <div className="grid gap-3">
              <Label>Email</Label>
              <CopyableField
                label="Email"
                value={user.email}
                className={cn(fieldClass, "min-h-[2.5rem] overflow-auto")}
              />
            </div>

            <div className="grid gap-3">
              <Label>Contact Number</Label>
              <CopyableField
                label="Contact Number"
                value={user.phoneNumber}
                className={cn(fieldClass, "min-h-[2.5rem] overflow-auto")}
              />
            </div>

            <div className="grid gap-3">
              <Label>Gender</Label>
              <div className={cn(fieldClass, "min-h-[2.5rem] overflow-auto")}>
                {genderLabel}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Role</Label>
              <div className={cn(fieldClass, "min-h-[2.5rem] overflow-auto")}>
                {roleLabel}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Referral Code</Label>
              <CopyableField
                label="Referral Code"
                value={user.referralCode}
                className={cn(
                  fieldClass,
                  "min-h-[2.5rem] overflow-auto font-mono tracking-wider",
                )}
              />
            </div>

            <div className="grid gap-3">
              <Label>Referral Count</Label>
              <div className={cn(fieldClass, "min-h-[2.5rem] overflow-auto")}>
                {referralCount}
              </div>
            </div>

            {/* Bank details */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                Bank Details
              </p>
              <div className="grid gap-3">
                <div className="grid gap-3">
                  <Label>Account Name</Label>
                  <CopyableField
                    label="Account Name"
                    value={user.accountName}
                    className={cn(fieldClass, "min-h-[2.5rem]")}
                  />
                </div>
                <div className="grid gap-3">
                  <Label>Account Number</Label>
                  <CopyableField
                    label="Account Number"
                    value={user.accountNumber}
                    className={cn(
                      fieldClass,
                      "min-h-[2.5rem] font-mono tracking-wider",
                    )}
                  />
                </div>
                <div className="grid gap-3">
                  <Label>Bank Name</Label>
                  <CopyableField
                    label="Bank Name"
                    value={user.bankName}
                    className={cn(fieldClass, "min-h-[2.5rem]")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
