"use client";

import { createPortal } from "react-dom";
import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { useUploadSlipMutation } from "@/store/api/splits/bonus-transactions";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

interface Props {
  transactionId: string;
  onClose: () => void;
}

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,application/pdf";
// Files are sent as base64 JSON (~37 % larger than the raw file).
// Keep this well under the backend request-body limit to avoid silent failures.
const MAX_MB = 1;

export function AddSlipModal({ transactionId, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    name: string;
    mimeType: string;
    dataUrl: string;
  } | null>(null);
  const [uploadSlip, { isLoading }] = useUploadSlipMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_MB} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip the "data:<mime>;base64," prefix to get raw base64
      setPreview({ name: file.name, mimeType: file.type, dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview) return;

    const base64 = preview.dataUrl.split(",")[1];

    // base64 string length in bytes ≈ raw file size × 4/3.
    // Catch this before hitting the network so the user gets an immediate,
    // specific message instead of a timeout after several retries.
    const estimatedPayloadBytes = Math.ceil((base64.length * 3) / 4);
    if (estimatedPayloadBytes > MAX_MB * 1024 * 1024) {
      toast.error(`File is too large. Please upload a file under ${MAX_MB} MB.`);
      return;
    }

    const result = await uploadSlip({
      id: transactionId,
      data: base64,
      fileName: preview.name,
      mimeType: preview.mimeType,
    });

    if ("error" in result) {
      const err = result.error as FetchBaseQueryError;
      if (err.status === 413) {
        toast.error(`File is too large. Please upload a file under ${MAX_MB} MB.`);
      } else if (
        err.status === "FETCH_ERROR" ||
        err.status === "TIMEOUT_ERROR"
      ) {
        toast.error("Upload failed. The file may be too large or the connection was lost.");
      } else if (
        typeof err.status === "number" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data
      ) {
        toast.error(String((err.data as { message: string }).message));
      } else {
        toast.error("Failed to upload slip. Please try again.");
      }
      return;
    }

    toast.success("Slip uploaded successfully.");
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-900000 flex items-center justify-center bg-black/50 px-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Upload Slip
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Drop zone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition cursor-pointer"
          >
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click to choose a file
            </p>
            <p className="text-xs text-gray-400">
              Image (JPG, PNG, WebP) or PDF · Max {MAX_MB} MB
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Preview */}
          {preview && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center gap-3">
              {preview.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.dataUrl}
                  alt="slip preview"
                  className="h-14 w-14 rounded object-cover border border-gray-200"
                />
              ) : (
                <div className="h-14 w-14 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-bold text-xs">
                  PDF
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {preview.name}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="text-xs text-red-500 hover:text-red-700 mt-0.5"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!preview || isLoading}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 transition flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Upload
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
