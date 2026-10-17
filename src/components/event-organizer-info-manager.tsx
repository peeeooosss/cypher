"use client";

import { useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { responseError } from "@/lib/client-error";

type Props = {
  eventId: string;
  initialPhotoUrl?: string | null;
  initialPhotoFileKey?: string | null;
  initialBio?: string | null;
  onChanged: () => void;
};

export function EventOrganizerInfoManager({
  eventId,
  initialPhotoUrl = null,
  initialPhotoFileKey = null,
  initialBio = null,
  onChanged,
}: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [photoFileKey, setPhotoFileKey] = useState<string | null>(initialPhotoFileKey);
  const [bio, setBio] = useState(initialBio ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const { startUpload } = useUploadThing("eventPhotoUploader", {
    onClientUploadComplete: (files) => {
      if (files?.length) {
        setPhotoUrl(files[0].url);
        setPhotoFileKey(files[0].key);
        setUploading(false);
      }
    },
    onUploadError: (err) => {
      setError(err.message || "Upload failed");
      setUploading(false);
    },
  });

  async function handleSave() {
    setSaving(true);
    setError("");

    const res = await fetch(`/api/organizer/events/${eventId}/organizer-info`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizerPhotoUrl: photoUrl,
        organizerPhotoFileKey: photoFileKey,
        organizerBio: bio || null,
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? responseError(res, json));
      setSaving(false);
      return;
    }

    setSaving(false);
    onChanged();
  }

  function handleRemovePhoto() {
    setPhotoUrl(null);
    setPhotoFileKey(null);
  }

  return (
    <div className="space-y-lg">
      <div>
        <div className="flex items-center justify-between gap-md">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Photo</p>
            <p className="mt-xs text-body-sm text-ink-muted">Upload organizer photo (single image, max ~3.5MB)</p>
          </div>
        </div>
        <div className="mt-md border border-line bg-paper-soft p-md">
          {photoUrl ? (
            <div className="flex flex-col gap-md sm:flex-row sm:items-center">
              <img
                src={photoUrl}
                alt="Organizer photo"
                className="h-40 w-40 object-cover border border-line"
              />
              <div className="flex flex-wrap gap-sm">
                <label className="flex cursor-pointer items-center gap-xs border border-line px-sm py-xs text-body-xs uppercase transition-colors hover:border-accent">
                  <span className="text-xs">↑</span>
                  Replace
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploading(true);
                        void startUpload([file]);
                      }
                      e.target.value = "";
                    }}
                    disabled={uploading}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="flex items-center gap-xs border border-line px-sm py-xs text-body-xs uppercase transition-colors hover:border-accent"
                  disabled={saving}
                >
                  <span className="text-xs">✕</span>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-sm py-lg text-center">
              <div className="text-2xl">↑</div>
              <p className="text-body-sm text-ink-muted">No photo uploaded</p>
              <label className="flex cursor-pointer items-center gap-xs border border-accent bg-accent px-sm py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80">
                <span className="text-xs">↑</span>
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploading(true);
                      void startUpload([file]);
                    }
                    e.target.value = "";
                  }}
                  disabled={uploading}
                />
              </label>
            </div>
          )}
          {uploading && (
            <div className="mt-md flex items-center gap-xs text-body-xs text-ink-muted">
              <span className="text-xs animate-pulse">⟳</span>
              Uploading...
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Bio</p>
        <textarea
          className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Enter organizer bio (e.g., about the studio/organizer)..."
          maxLength={1000}
        />
        <p className="mt-xs text-body-xs text-ink-muted">{bio.length}/1000 characters</p>
      </div>

      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading}
          className="flex items-center gap-xs border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80 disabled:opacity-60"
        >
          {saving && <span className="text-xs animate-pulse">⟳</span>}
          Save Organizer Info
        </button>
        {error && <p className="mt-sm text-body-sm text-accent">{error}</p>}
      </div>
    </div>
  );
}
