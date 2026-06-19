"use client";

import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { useLazyFetchSlipQuery } from "@/store/api/splits/bonus-transactions";
import { useEffect } from "react";

interface Props {
  transactionId: string;
  onClose: () => void;
}

export function ViewSlipModal({ transactionId, onClose }: Props) {
  const [fetchSlip, { data, isFetching }] = useLazyFetchSlipQuery();

  useEffect(() => {
    fetchSlip(transactionId);
  }, [fetchSlip, transactionId]);

  const srcUrl = data ? `data:${data.mimeType};base64,${data.data}` : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[900000] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            View Slip
            {data?.fileName && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                {data.fileName}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-[300px]">
          {isFetching ? (
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          ) : srcUrl && data?.mimeType.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={srcUrl}
              alt="slip"
              className="max-w-full max-h-[65vh] rounded-lg object-contain"
            />
          ) : srcUrl && data?.mimeType === "application/pdf" ? (
            <embed
              src={srcUrl}
              type="application/pdf"
              className="w-full h-[65vh] rounded-lg"
            />
          ) : (
            <p className="text-sm text-gray-400">Unable to load slip.</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0 flex justify-between items-center">
          {srcUrl && (
            <a
              href={srcUrl}
              download={data?.fileName ?? "slip"}
              className="text-sm text-blue-600 hover:underline"
            >
              Download
            </a>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
