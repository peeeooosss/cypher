"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  studioName: string | null;
  studioFoundedAt: Date | null;
};

type LogoUploadState = "idle" | "uploading" | "success" | "error";

export function OrganizerProfileForm({ initialProfile }: { initialProfile: Profile & { studioLogoUrl: string | null } }) {
  const router = useRouter();
  const [studioName, setStudioName] = useState(initialProfile.studioName ?? "");
  const [studioFoundedAt, setStudioFoundedAt] = useState(
    initialProfile.studioFoundedAt ? new Date(initialProfile.studioFoundedAt).getFullYear().toString() : "",
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(initialProfile.studioLogoUrl);
  const [logoState, setLogoState] = useState<LogoUploadState>("idle");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoState("uploading");
    setLogoError(null);

    const formData = new FormData();
    formData.set("file", file);

    const res = await fetch("/api/users/me/studio-logo", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setLogoUrl(data.studioLogoUrl);
      setLogoState("success");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setLogoError(data?.error ?? "Upload failed.");
      setLogoState("error");
    }
  }

  async function handleLogoRemove() {
    setLogoState("uploading");
    setLogoError(null);

    const res = await fetch("/api/users/me/studio-logo", { method: "DELETE" });

    if (res.ok) {
      setLogoUrl(null);
      setLogoState("idle");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setLogoError(data?.error ?? "Failed to remove logo.");
      setLogoState("error");
    }
  }

  async function handleSave() {
    setSaving(true);
    setNotice(null);

    const foundedYear = studioFoundedAt || null;
    const foundedDate = foundedYear
      ? new Date(`${parseInt(foundedYear, 10)}-01-01T00:00:00Z`)
      : null;

    const res = await fetch("/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studioName: studioName.trim() || null,
        studioFoundedAt: foundedDate,
      }),
    });

    if (res.ok) {
      setNotice("Studio profile saved.");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setNotice(data?.error ?? "Failed to save.");
    }
    setSaving(false);
  }

  return (
    <div className="border border-line bg-paper-soft p-lg">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
        Studio profile
      </p>

      <div className="mt-md space-y-md">
        <div>
          <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
            Studio name
          </label>
          <input
            type="text"
            placeholder="e.g. CYPHER Dance Studio"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-md text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            maxLength={100}
          />
        </div>

        <div>
          <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
            Founded (year)
          </label>
          <input
            type="number"
            placeholder="e.g. 2024"
            value={studioFoundedAt}
            onChange={(e) => setStudioFoundedAt(e.target.value)}
            min={1900}
            max={new Date().getFullYear() + 1}
            className="mt-xs w-full max-w-xs border border-line bg-paper px-md py-sm text-body-md text-ink focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
            Studio logo
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleLogoUpload}
            className="mt-xs hidden"
          />

          {logoUrl ? (
            <div className="mt-sm flex items-center gap-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Studio logo" className="h-12 w-12 rounded-full border border-line object-cover" />
              <div className="flex gap-sm">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-line px-md py-xs font-mono text-[0.65rem] uppercase text-ink hover:border-accent hover:text-accent"
                  disabled={logoState === "uploading"}
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  className="border border-line px-md py-xs font-mono text-[0.65rem] uppercase text-ink hover:border-accent hover:text-accent"
                  disabled={logoState === "uploading"}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={logoState === "uploading"}
              className="mt-sm border border-line px-md py-sm font-mono text-[0.7rem] uppercase text-ink hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
            >
              {logoState === "uploading" ? "Uploading…" : "Upload logo"}
            </button>
          )}

          {logoError && <p className="mt-xs text-body-sm text-red-500">{logoError}</p>}
        </div>
      </div>

      {notice && <p className="mt-md font-mono text-[0.65rem] uppercase text-accent">{notice}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-lg w-full border border-accent bg-accent px-lg py-md text-center font-mono text-[0.7rem] uppercase tracking-[0.15em] text-paper disabled:cursor-wait disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save studio profile"}
      </button>
    </div>
  );
}
