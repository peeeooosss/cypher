"use client";

import { useRef, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { UploadProgress, type UploadStatus } from "@/components/ui/upload-progress";

const MAX_FILE_BYTES = 3.5 * 1024 * 1024;

export function JudgePhotoUpload({
  initial,
  onChange,
}: {
  initial?: string | null;
  onChange: (value: string | null, fileKey: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initial ?? null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const { startUpload } = useUploadThing("judgePhotoUploader", {
    uploadProgressGranularity: "fine",
    onUploadBegin: () => {
      setStatus("uploading");
      setProgress(0);
      setError("");
    },
    onUploadProgress: (p) => setProgress(p),
    onUploadError: (uploadError) => {
      setStatus("error");
      setError(uploadError.message || "Upload failed.");
    },
  });

  async function handleFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("error");
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setStatus("error");
      setError("Image is too large. Keep it under 3.5MB.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setStatus("uploading");
    setProgress(0);

    try {
      const uploaded = await startUpload([file]);
      const result = uploaded?.[0];
      if (!result) {
        setPreview(initial ?? null);
        setStatus("error");
        setError("Upload failed. Please try again.");
        return;
      }

      setPreview(result.ufsUrl);
      setStatus("success");
      onChange(result.ufsUrl, result.key);
    } catch {
      setPreview(initial ?? null);
      setStatus("error");
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-sm">
      {preview ? (
        <div className="flex items-start gap-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Judge photo preview" className="h-24 w-24 rounded-lg border border-line object-cover" />
          <button
            type="button"
            disabled={uploading}
            className="border border-line px-sm py-xs font-mono text-[0.65rem] uppercase text-ink-muted hover:border-accent hover:text-accent"
            onClick={() => {
              setPreview(null);
              onChange(null, null);
              setStatus("idle");
              setError("");
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="block cursor-pointer border border-dashed border-line px-md py-lg text-center text-body-sm text-ink-muted transition-colors hover:border-accent">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em]">
            {uploading ? "Uploading..." : "Upload judge photo (max 3.5MB)"}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </label>
      )}
      <UploadProgress
        status={status}
        progress={progress}
        successLabel="Photo uploaded"
        errorLabel={error || undefined}
      />
    </div>
  );
}
