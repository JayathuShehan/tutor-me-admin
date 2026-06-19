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
import { Copy, Eye, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface SubjectDetailsProps {
  id: string;
  name: string;
  email: string;
  password?: string;
  role?: "admin" | "user" | "tutor";
  phoneNumber?: string;
  birthday?: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  gender?: "male" | "female";
  avatar?: string;
  referralCode?: string;
}

function CopyableDisplayField({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className: string;
}) {
  const copyValue = String(value ?? "").trim();
  const canCopy = Boolean(copyValue);

  const handleCopy = async () => {
    if (!canCopy) return;

    try {
      await navigator.clipboard.writeText(copyValue);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      console.error(`Failed to copy ${label}:`, error);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!canCopy}
      aria-label={canCopy ? `Copy ${label}` : undefined}
      title={canCopy ? `Click to copy ${label.toLowerCase()}` : undefined}
      className={`${className} group flex items-center justify-between gap-3 text-left ${
        canCopy ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{copyValue || "-"}</span>
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

export function UserDetails({
  name,
  email,
  role,
  phoneNumber,
  birthday,
  status,
  gender,
  avatar,
  referralCode,
}: SubjectDetailsProps) {
  const [open, setOpen] = useState(false);

  const displayFieldClass =
    "w-full rounded-md border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-700 dark:text-white/90";
  const displayValue = (value?: string) =>
    value && value !== "" ? value : "-";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Eye cursor="pointer" className="text-blue-500 hover:text-blue-700" />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[625px] bg-white z-50 dark:bg-gray-800 dark:text-white/90 p-0 overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0"
      >
        <DialogHeader className="shrink-0 flex-row items-start justify-between bg-white dark:bg-gray-800 px-6 py-4 border-b z-40">
          <div className="space-y-2 text-left">
            <DialogTitle>Details</DialogTitle>
            <DialogDescription>User Details</DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label>Profile Picture</Label>
              <div className="w-full flex justify-center">
                <div className="w-35 h-35 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
                  <img
                    src={avatar || "/images/user/user.png"}
                    alt={"avatar Image"}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              <Label>Name</Label>
              <CopyableDisplayField
                label="Name"
                value={name}
                className={cn(displayFieldClass)}
              />
            </div>
            <div className="grid gap-3">
              <Label>Email</Label>
              <CopyableDisplayField
                label="Email"
                value={email}
                className={cn(
                  displayFieldClass,
                  "min-h-[2.5rem]",
                  "overflow-auto",
                )}
              />
            </div>
            <div className="grid gap-3">
              <Label>Role</Label>
              <div
                className={cn(
                  displayFieldClass,
                  "min-h-[2.5rem]",
                  "overflow-auto",
                )}
              >
                {displayValue(
                  role ? role.charAt(0).toUpperCase() + role.slice(1) : "-",
                )}
              </div>
            </div>
            <div className="grid gap-3">
              <Label>Contact Number</Label>
              <CopyableDisplayField
                label="Contact Number"
                value={phoneNumber}
                className={cn(
                  displayFieldClass,
                  "min-h-[2.5rem]",
                  "overflow-auto",
                )}
              />
            </div>
            <div className="grid gap-3">
              <Label>Date of Birth</Label>
              <div
                className={cn(
                  displayFieldClass,
                  "min-h-[2.5rem]",
                  "overflow-auto",
                )}
              >
                {birthday
                  ? new Date(birthday)
                      .toLocaleDateString("en-CA")
                      .replace(/-/g, "/")
                  : "-"}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Gender</Label>
              <div
                className={cn(
                  displayFieldClass,
                  "min-h-[2.5rem]",
                  "overflow-auto",
                )}
              >
                {displayValue(
                  gender
                    ? gender.charAt(0).toUpperCase() + gender.slice(1)
                    : "-",
                )}
              </div>
            </div>
            <div className="grid gap-3">
              <Label>Status</Label>
              <div
                className={cn(
                  displayFieldClass,
                  "min-h-[2.5rem]",
                  "overflow-auto",
                )}
              >
                {displayValue(
                  status
                    ? status.charAt(0).toUpperCase() + status.slice(1)
                    : "-",
                )}
              </div>
            </div>
            <div className="grid gap-3">
              <Label>Referral Code</Label>
              <CopyableDisplayField
                label="Referral Code"
                value={referralCode}
                className={cn(
                  displayFieldClass,
                  "min-h-[2.5rem]",
                  "overflow-auto font-mono tracking-wider",
                )}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
