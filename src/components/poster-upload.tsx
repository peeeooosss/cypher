"use client";

import { useRef, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";

const MAX_FILE_BYTES = 1.5 * 1024 * 1024;

export function PosterUpload({
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
  const { startUpload } = useUploadThing("eventPosterUploader", {
    onUploadError: (uploadError) => setError(uploadError.message || "Upload failed."),
  });

  async function handleFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Image is too large. Keep it under 1.5MB.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const uploaded = await startUpload([file]);
      const result = uploaded?.[0];
      if (!result) {
        setPreview(initial ?? null);
        setError("Upload failed. Please try again.");
        return;
      }

      setPreview(result.ufsUrl);
      onChange(result.ufsUrl, result.key);
    } catch {
      setPreview(initial ?? null);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-sm">
      {preview ? (
        <div className="flex items-start gap-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Poster preview" className="h-32 border border-line object-cover" />
          <button
            type="button"
            disabled={uploading}
            className="border border-line px-sm py-xs font-mono text-[0.65rem] uppercase text-ink-muted hover:border-accent hover:text-accent"
            onClick={() => {
              setPreview(null);
              onChange(null, null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="block cursor-pointer border border-dashed border-line px-md py-lg text-center text-body-sm text-ink-muted transition-colors hover:border-accent">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em]">
            {uploading ? "Uploading..." : "Upload poster"}
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
      {error ? <p className="text-body-sm text-accent">{error}</p> : null}
    </div>
  );
}
