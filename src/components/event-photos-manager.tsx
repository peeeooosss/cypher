"use client";

import { useRef, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { responseError } from "@/lib/client-error";
import { useToast } from "@/components/ui/toast";

const MAX_EVENT_PHOTOS = 6;
const MAX_BYTES = 3.5 * 1024 * 1024;

export type EventPhotoRecord = {
  id: string;
  eventId: string;
  caption: string | null;
  photoUrl: string;
  photoFileKey: string | null;
  displayOrder: number;
  isPublic: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function EventPhotosManager({
  eventId,
  initialPhotos,
  onChanged,
}: {
  eventId: string;
  initialPhotos: EventPhotoRecord[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<EventPhotoRecord[]>(initialPhotos);
  const [adding, setAdding] = useState(false);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { startUpload } = useUploadThing("eventPhotoUploader", {
    onUploadError: (e) => toast(e.message || "Upload failed.", "error"),
  });

  const remaining = MAX_EVENT_PHOTOS - photos.length;

  async function handleFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large. Keep it under 3.5MB.");
      return;
    }
    if (remaining <= 0) {
      setError(`Maximum of ${MAX_EVENT_PHOTOS} photos per event. Remove one first.`);
      return;
    }

    setUploading(true);
    try {
      const uploaded = await startUpload([file]);
      const result = uploaded?.[0];
      if (!result) {
        setError("Upload failed. Please try again.");
        return;
      }

      const res = await fetch(`/api/events/${eventId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl: result.ufsUrl,
          photoFileKey: result.key,
          caption: caption.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await responseError(res, "Failed to add photo"));

      const photo = (await res.json()) as EventPhotoRecord;
      setPhotos((prev) => [...prev, photo]);
      setCaption("");
      setAdding(false);
      toast("Photo added", "success");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function patchPhoto(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/events/${eventId}/photos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await responseError(res, "Failed to update photo"));
      const saved = (await res.json()) as EventPhotoRecord;
      setPhotos((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update photo", "error");
    }
  }

  async function deletePhoto(id: string) {
    if (!window.confirm("Remove this photo?")) return;
    try {
      const res = await fetch(`/api/events/${eventId}/photos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await responseError(res, "Failed to remove photo"));
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      toast("Photo removed", "success");
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to remove photo", "error");
    }
  }

  return (
    <div className="border border-line p-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
          {photos.length} of {MAX_EVENT_PHOTOS} photos · {remaining} left
        </p>
        <button
          type="button"
          disabled={remaining <= 0}
          onClick={() => setAdding((v) => !v)}
          className="border border-accent bg-accent px-md py-sm font-bold uppercase text-paper disabled:opacity-50"
        >
          + Add photo
        </button>
      </div>

      {adding ? (
        <div className="mt-lg border border-accent bg-paper-soft p-md">
          <label className="block cursor-pointer border border-dashed border-line px-md py-lg text-center text-body-sm text-ink-muted transition-colors hover:border-accent">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em]">
              {uploading ? "Uploading..." : "Choose photo (max 3.5MB)"}
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
          <input
            className="mt-sm w-full border border-line bg-paper px-md py-sm text-body-sm"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
          />
          <div className="mt-sm flex justify-end">
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError("");
                setCaption("");
              }}
              className="border border-line px-md py-sm text-button-md font-bold uppercase hover:border-accent"
            >
              Done
            </button>
          </div>
          {error ? <p className="mt-sm text-body-sm text-accent">{error}</p> : null}
        </div>
      ) : null}

      <div className="mt-lg grid gap-md sm:grid-cols-2 lg:grid-cols-3">
        {photos.length === 0 && !adding ? (
          <p className="border border-line p-lg text-body-sm text-ink-muted sm:col-span-2 lg:col-span-3">
            No highlight photos yet.
          </p>
        ) : null}
        {photos.map((photo) => (
          <div key={photo.id} className="border border-line bg-paper-soft p-sm">
            <div className="relative aspect-[4/3] overflow-hidden bg-paper-raised">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.photoUrl}
                alt={photo.caption ?? "Event highlight"}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              {!photo.isPublic ? (
                <span className="absolute left-xs top-xs border border-line bg-paper/85 px-xs py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-ink-muted">
                  Hidden
                </span>
              ) : null}
            </div>
            <input
              className="mt-xs w-full border border-line bg-paper px-sm py-xs text-body-sm"
              value={photo.caption ?? ""}
              onChange={(e) =>
                setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, caption: e.target.value } : p)))
              }
              onBlur={(e) => {
                const next = e.target.value.trim() || null;
                if ((photo.caption ?? null) !== next) void patchPhoto(photo.id, { caption: next });
              }}
              placeholder="Caption"
            />
            <div className="mt-xs flex flex-wrap gap-xs">
              <button
                type="button"
                onClick={() => void patchPhoto(photo.id, { isPublic: !photo.isPublic })}
                className="border border-line px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] hover:border-accent"
              >
                {photo.isPublic ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={() => void deletePhoto(photo.id)}
                className="border border-line px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-accent hover:border-accent"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
