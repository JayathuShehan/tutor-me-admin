"use client";

import { Loader2, Upload } from "lucide-react";
import { default as NextImage } from "next/image";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploadDropzoneProps {
  onUploaded: (url: string) => void;
  imageOnly?: boolean;
}

const IMAGE_ACCEPT_CONFIG = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g)$/i;
const IMAGE_UPLOAD_ERROR = "Only PNG, JPG, or JPEG image files are allowed.";

const isAllowedImageFile = (file: File) => {
  const hasAllowedMimeType =
    file.type === "image/png" || file.type === "image/jpeg";
  const hasAllowedExtension = IMAGE_EXTENSION_PATTERN.test(file.name);

  return hasAllowedMimeType && hasAllowedExtension;
};

export default function FileUploadDropzone({
  onUploaded,
  imageOnly = false,
}: FileUploadDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (imageOnly && !isAllowedImageFile(file)) {
        setUploadError(IMAGE_UPLOAD_ERROR);
        return;
      }

      setUploading(true);
      setFileName(file.name);
      setUploadError("");

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }

      const signed = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: `${Date.now()}-${file.name}`,
          fileType: file.type,
        }),
      }).then((res) => res.json());

      const uploadUrl = signed.uploadUrl;
      if (!uploadUrl) {
        setUploading(false);
        alert("Failed to generate SAS URL");
        return;
      }

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": file.type,
        },
        body: file,
      });

      setUploading(false);

      if (!uploadRes.ok) {
        alert("Upload failed");
        return;
      }

      const publicUrl = uploadUrl.split("?")[0];
      onUploaded(publicUrl);
    },
    [imageOnly, onUploaded],
  );

  const removeFile = () => {
    setFileName("");
    setPreviewUrl(null);
    setUploadError("");
    onUploaded("");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: () => {
      if (!imageOnly) return;
      setUploadError(IMAGE_UPLOAD_ERROR);
    },
    accept: imageOnly ? IMAGE_ACCEPT_CONFIG : undefined,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full max-w-full overflow-hidden rounded-xl border-2 border-dashed p-8 flex flex-col items-center gap-3 text-center transition-colors cursor-pointer
        ${
          isDragActive
            ? "border-blue-400 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20"
            : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-blue-500 dark:hover:bg-blue-950/20"
        }`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Uploading...
          </p>
        </>
      ) : isDragActive ? (
        <>
          <Upload className="w-8 h-8 text-blue-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Drop the file here...
          </p>
        </>
      ) : (
        <>
          <Upload className="w-8 h-8 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {fileName ? fileName : "Drag & drop or tap to upload"}
          </p>
          <p className="text-xs text-gray-400">
            {imageOnly
              ? "Only PNG, JPG, or JPEG files are allowed"
              : "Click or drag a file here to upload"}
          </p>

          {uploadError && (
            <p className="text-sm text-red-500">{uploadError}</p>
          )}

          {fileName && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeFile(); }}
              className="text-xs text-red-500 hover:text-red-700"
              aria-label="Remove uploaded file"
            >
              Remove
            </button>
          )}

          {previewUrl && (
            <div className="flex w-full min-w-0 justify-center overflow-hidden">
              <NextImage
                src={previewUrl}
                alt="Preview"
                width={112}
                height={112}
                className="h-24 w-24 shrink-0 rounded-lg border border-gray-200 object-cover shadow-sm dark:border-gray-700 sm:h-28 sm:w-28"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
