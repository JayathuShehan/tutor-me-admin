"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSendUserTempPasswordMutation } from "@/store/api/splits/users";
import { Send } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface ResetPasswordProps {
  userId: string;
  disabled?: boolean;
}

export function ResetPassword({
  userId,
  disabled = false,
}: ResetPasswordProps) {
  const [open, setOpen] = useState(false);
  const [resendPassword, { isLoading }] = useSendUserTempPasswordMutation();

  const handleResend = async () => {
    if (disabled) return;
    try {
      await resendPassword(userId).unwrap();

      toast.success("Temporary password sent successfully!");
      setOpen(false);
    } catch (error) {
      //const message = getErrorInApiResult({ error }) || "Failed to send temporary password";
      const message = `Failed to send temporary password : ${error}`;
      toast.error(message);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (disabled) return;
        setOpen(nextOpen);
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={
            disabled
              ? "Password reset is only available for approved admins"
              : "Reset password"
          }
          className="disabled:cursor-not-allowed"
        >
          <Send
            className={
              disabled
                ? "text-gray-300 dark:text-gray-600"
                : "cursor-pointer text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
            }
          />
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent className="bg-white dark:bg-gray-800 dark:text-white/90 z-50">
        <AlertDialogHeader>
          <AlertDialogTitle>Send Temporary Password?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will send a temporary password to the user via email.
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleResend}
            disabled={isLoading}
            className="bg-red-500 text-white disabled:opacity-50"
          >
            {isLoading ? "Sending..." : "Resend Password"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
