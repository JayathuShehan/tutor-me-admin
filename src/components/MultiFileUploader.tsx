/* eslint-disable @next/next/no-img-element */
"use client";

import {
  MANDATORY_CERTIFICATE_TYPE_VALUES,
  OPTIONAL_CERTIFICATE_TYPE_VALUES,
} from "@/configs/app-constants";
import { Eye, Loader2, Minus, Plus, X } from "lucide-react";
import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

export interface CertificateFileItem {
  type: string;
  url: string;
  id?: string;
}

interface NewFileItem {
  file: File;
  url?: string;
  previewUrl?: string;
  /** Object URL created for PDF preview before/after upload; revoked on remove. */
  blobUrl?: string;
  type: string;
}

// Everything the preview modal needs to render a single file.
interface PreviewData {
  fileName: string;
  /** Raw/remote URL (used as fallback src and for extension sniffing). */
  url?: string;
  /** data: URL for image previews (new uploads). */
  previewUrl?: string;
  /** blob: URL for PDF previews (new uploads). */
  blobUrl?: string;
  /** Known MIME type when available (new uploads carry the File's type). */
  contentType?: string;
}

const isImageSource = (data: PreviewData): boolean =>
  (data.contentType ?? "").startsWith("image/") ||
  !!data.previewUrl ||
  /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)(\?|$)/i.test(data.url ?? "");

const isPdfSource = (data: PreviewData): boolean =>
  (data.contentType ?? "") === "application/pdf" ||
  /\.pdf(\?|$)/i.test(data.url ?? "");

function PreviewModal({
  data,
  onClose,
}: {
  data: PreviewData;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);

  const isImage = isImageSource(data);
  const isPdf = isPdfSource(data);
  const imageSrc = data.previewUrl ?? data.url;
  const pdfSrc = data.blobUrl ?? data.url;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed right-4 top-4 z-[70] flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg transition hover:bg-red-50 hover:text-red-500 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        title="Close preview"
        aria-label="Close preview"
      >
        <X size={20} />
      </button>

      <div className="relative flex max-h-[90vh] w-[90vw] max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 dark:border-gray-700">
          <p className="max-w-[70%] truncate text-sm font-medium text-gray-800 dark:text-gray-100">
            {data.fileName}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setScale((s) => Math.max(0.25, +(s - 0.25).toFixed(2)))
              }
              className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Zoom out"
            >
              <Minus size={14} />
            </button>
            <span className="w-10 text-center text-xs text-gray-500 dark:text-gray-400">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(4, +(s + 0.25).toFixed(2)))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Zoom in"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition hover:bg-red-50 hover:text-red-500 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Close preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center overflow-auto bg-gray-50 p-4 dark:bg-gray-800">
          {isImage && imageSrc && (
            <div
              style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
              className="transition-transform duration-150"
            >
              <img
                src={imageSrc}
                alt={data.fileName}
                className="max-w-full rounded shadow"
              />
            </div>
          )}

          {!isImage && isPdf && pdfSrc && (
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                width: "100%",
                height: "70vh",
              }}
              className="transition-transform duration-150"
            >
              <embed
                src={pdfSrc}
                type="application/pdf"
                className="h-full w-full rounded shadow"
              />
            </div>
          )}

          {!isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
              <p className="text-sm">Preview not available for this file type.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Required (educational) document types are grouped at the top and labelled
// "(Required)" so admins can tell them apart from optional documents. At least
// one required document must be uploaded — enforced by the form schema.
const renderCertificateTypeOptions = () => (
  <>
    <option value="" disabled>
      Document Type
    </option>
    <optgroup label="Required Documents">
      {MANDATORY_CERTIFICATE_TYPE_VALUES.map((opt) => (
        <option key={opt} value={opt}>
          {opt} (Required)
        </option>
      ))}
    </optgroup>
    <optgroup label="Optional Documents">
      {OPTIONAL_CERTIFICATE_TYPE_VALUES.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </optgroup>
  </>
);

interface SimpleUploadProps {
  mode?: "simple";
  onUploaded: (urls: string[]) => void;
  defaultFiles?: unknown[];
}

interface CertificateUploadProps {
  mode: "certificate";
  onUploaded: (items: CertificateFileItem[]) => void;
  defaultFiles?: unknown[];
}

type MultiFileUploadDropzoneProps = SimpleUploadProps | CertificateUploadProps;

const getSafeFileUrl = (file: unknown): string => {
  if (typeof file === "string") return file;

  if (typeof file === "object" && file !== null) {
    const item = file as Record<string, unknown>;

    if (typeof item.url === "string") return item.url;

    if (
      typeof item.url === "object" &&
      item.url !== null &&
      typeof (item.url as Record<string, unknown>).url === "string"
    ) {
      return (item.url as Record<string, unknown>).url as string;
    }
  }

  return "";
};

const getSafeFileType = (file: unknown): string => {
  if (typeof file === "object" && file !== null) {
    const item = file as Record<string, unknown>;
    if (typeof item.type === "string") return item.type;
  }

  return "";
};

const normalizeFiles = (files?: unknown[]): CertificateFileItem[] => {
  if (!Array.isArray(files)) return [];

  return files
    .map((file) => ({
      type: getSafeFileType(file),
      url: getSafeFileUrl(file),
    }))
    .filter((file) => file.url);
};

export default function MultiFileUploadDropzone(
  props: MultiFileUploadDropzoneProps,
) {
  const isCertMode = props.mode === "certificate";

  const [uploading, setUploading] = useState(false);
  const [newFiles, setNewFiles] = useState<NewFileItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [existingFiles, setExistingFiles] = useState<CertificateFileItem[]>(
    () => normalizeFiles(props.defaultFiles),
  );

  const [previewItem, setPreviewItem] = useState<PreviewData | null>(null);

  useEffect(() => {
    setExistingFiles(normalizeFiles(props.defaultFiles));
  }, [props.defaultFiles]);

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: unknown[]) => {
      if (fileRejections.length > 0) {
        setError("Only images and PDF files are accepted");
      } else {
        setError(null);
      }

      const incoming: NewFileItem[] = acceptedFiles.map((file) => ({
        file,
        type: "",
        // Pre-build a blob URL for PDFs so they can be previewed immediately.
        blobUrl:
          file.type === "application/pdf"
            ? URL.createObjectURL(file)
            : undefined,
      }));

      setNewFiles((prev) => [...prev, ...incoming]);

      for (const fileObj of incoming) {
        const file = fileObj.file;
        setUploading(true);

        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = () => {
            fileObj.previewUrl = reader.result as string;
            setNewFiles((prev) => [...prev]);
          };
          reader.readAsDataURL(file);
        }

        try {
          const signed = await fetch("/api/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: `${Date.now()}-${file.name}`,
              fileType: file.type,
            }),
          }).then((res) => res.json());

          const uploadUrl = signed.uploadUrl;
          if (!uploadUrl) throw new Error("Failed to generate upload URL");

          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "x-ms-blob-type": "BlockBlob",
              "Content-Type": file.type,
            },
            body: file,
          });

          if (!uploadRes.ok) throw new Error("Upload failed");

          fileObj.url = uploadUrl.split("?")[0];
          setNewFiles((prev) => [...prev]);
        } catch (err) {
          console.error(err);
          alert(`Upload failed for ${file.name}`);
        } finally {
          setUploading(false);
        }
      }
    },
    [],
  );

  const onUploadedRef = useRef(props.onUploaded);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUploadedRef.current = props.onUploaded as any;
  }, [props.onUploaded]);

  // Skip the initial mount call so forms don't receive an empty array
  // before the user has interacted with the uploader (prevents premature validation errors)
  const hasInteracted = useRef(false);

  useEffect(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true;
      return;
    }

    const uploadedNew: CertificateFileItem[] = newFiles
      .filter((file) => file.url)
      .map((file) => ({
        type: file.type,
        url: file.url!,
      }));

    const combined: CertificateFileItem[] = [...existingFiles, ...uploadedNew];

    if (isCertMode) {
      (onUploadedRef.current as CertificateUploadProps["onUploaded"])(combined);
    } else {
      (onUploadedRef.current as SimpleUploadProps["onUploaded"])(
        combined.map((file) => file.url),
      );
    }
  }, [newFiles, existingFiles, isCertMode]);

  const removeExisting = (index: number, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setExistingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExistingType = (index: number, type: string) => {
    setExistingFiles((prev) =>
      prev.map((file, i) => (i === index ? { ...file, type } : file)),
    );
  };

  const removeNew = (index: number, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setNewFiles((prev) => {
      const target = prev[index];
      if (target?.blobUrl) URL.revokeObjectURL(target.blobUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateNewType = (index: number, type: string) => {
    setNewFiles((prev) =>
      prev.map((file, i) => (i === index ? { ...file, type } : file)),
    );
  };

  // Keep a live ref of the pending files so the unmount cleanup can revoke any
  // outstanding blob URLs without re-running on every change.
  const newFilesRef = useRef<NewFileItem[]>(newFiles);
  useEffect(() => {
    newFilesRef.current = newFiles;
  }, [newFiles]);

  useEffect(() => {
    return () => {
      newFilesRef.current.forEach((file) => {
        if (file.blobUrl) URL.revokeObjectURL(file.blobUrl);
      });
    };
  }, []);

  const previewExisting = (
    cert: CertificateFileItem,
    e: MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();
    setPreviewItem({
      fileName: cert.url.split("/").pop()?.split("?")[0] || "Uploaded file",
      url: cert.url,
    });
  };

  const previewNew = (
    fileObj: NewFileItem,
    e: MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();
    setPreviewItem({
      fileName: fileObj.file.name,
      url: fileObj.url,
      previewUrl: fileObj.previewUrl,
      blobUrl: fileObj.blobUrl,
      contentType: fileObj.file.type,
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "image/*": [],
      "application/pdf": [],
    },
  });

  return (
    <div className="w-full space-y-4">
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-md border-2 border-dashed p-6 transition-colors ${
          isDragActive
            ? "border-brand-300 bg-brand-50/40 dark:border-brand-500 dark:bg-gray-800/80"
            : "border-gray-300 bg-white hover:border-brand-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-500 dark:hover:bg-gray-800/80"
        }`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            ) : (
              <Plus className="h-6 w-6 text-brand-500" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {isDragActive ? "Drop files here" : "Click or drag to upload"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              PDF, Images
            </p>
          </div>
        </div>
      </div>

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      {(existingFiles.length > 0 || newFiles.length > 0) && (
        <div className="grid gap-2">
          {existingFiles.map((cert, i) => {
            const fileName = cert.url.split("/").pop() || "Uploaded file";

            return (
              <div
                key={`existing-${i}-${cert.url}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex min-w-0 items-center space-x-3 overflow-hidden">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      LINK
                    </span>
                  </div>

                  <div className="grid min-w-0 gap-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {fileName}
                    </p>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Existing Upload
                    </p>

                    {isCertMode && (
                      <select
                        value={cert.type}
                        onChange={(e) => updateExistingType(i, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-[220px] rounded border bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {renderCertificateTypeOptions()}
                      </select>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={(e) => previewExisting(cert, e)}
                    className="p-2 text-gray-400 transition-colors hover:text-brand-500"
                    title="Preview file"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => removeExisting(i, e)}
                    className="p-2 text-gray-400 transition-colors hover:text-red-500"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {newFiles.map((fileObj, i) => (
            <div
              key={`new-${i}-${fileObj.file.name}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex min-w-0 items-center space-x-3 overflow-hidden">
                {fileObj.previewUrl ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <img
                      src={fileObj.previewUrl}
                      alt={fileObj.file.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      FILE
                    </span>
                  </div>
                )}

                <div className="grid min-w-0 gap-1">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {fileObj.file.name}
                  </p>

                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>

                    {fileObj.url && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Uploaded
                      </span>
                    )}
                  </div>

                  {isCertMode && (
                    <select
                      value={fileObj.type}
                      onChange={(e) => updateNewType(i, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full max-w-[220px] rounded border bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {renderCertificateTypeOptions()}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={(e) => previewNew(fileObj, e)}
                  className="p-2 text-gray-400 transition-colors hover:text-brand-500"
                  title="Preview file"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => removeNew(i, e)}
                  className="p-2 text-gray-400 transition-colors hover:text-red-500"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewItem && (
        <PreviewModal
          data={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}
