"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SKILLS, SKILL_LABELS } from "@/lib/skills";
import { DANCE_STYLES, EXPERIENCE_OPTIONS, isDanceStyle } from "@/lib/styles";
import { responseError } from "@/lib/client-error";
import { useUploadThing } from "@/lib/uploadthing";

export type ArtistProfile = {
  name: string | null;
  avatarUrl: string | null;
  isProfilePublic: boolean;
  style: string | null;
  crew: string | null;
  city: string | null;
  country: string | null;
  experience: string | null;
  socialHandle: string | null;
  keywords: string | null;
  referral: string | null;
  skills: string[];
};

const PROFILE_FIELDS: Array<{
  name: keyof Omit<ArtistProfile, "name" | "skills" | "avatarUrl" | "isProfilePublic">;
  label: string;
  placeholder: string;
}> = [
  { name: "crew", label: "Crew", placeholder: "e.g. Soul Mechanics" },
  { name: "city", label: "City", placeholder: "e.g. Guwahati" },
  { name: "country", label: "Country", placeholder: "e.g. India" },
  { name: "socialHandle", label: "Social handle", placeholder: "@yourname" },
  { name: "keywords", label: "Keywords / tags — helps people find you", placeholder: "e.g. breaking, popping, Mumbai, House battles" },
  { name: "referral", label: "How did you hear about us?", placeholder: "e.g. Instagram, Friend" },
];

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function ArtistProfileForm({ profile }: { profile: ArtistProfile }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [skills, setSkills] = useState<string[]>(profile.skills ?? []);
  const [isProfilePublic, setIsProfilePublic] = useState(profile.isProfilePublic ?? true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl ?? null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarState, setAvatarState] = useState<"idle" | "uploading" | "error">("idle");
  const [avatarError, setAvatarError] = useState("");
  const [profileError, setProfileError] = useState("");
  const { startUpload } = useUploadThing("avatarUploader", {
    onUploadError: (uploadError) => setAvatarError(uploadError.message || "Failed to upload photo."),
  });

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  async function handleAvatarFile(file: File | undefined) {
    setAvatarState("idle");
    setAvatarError("");
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      setAvatarState("error");
      setAvatarError("Only JPG, PNG, or WebP up to 5MB");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setAvatarState("error");
      setAvatarError("Only JPG, PNG, or WebP up to 5MB");
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));

    setAvatarState("uploading");

    try {
      const uploaded = await startUpload([file]);
      const result = uploaded?.[0];
      if (!result) {
        setAvatarError("Failed to upload photo.");
        setAvatarState("error");
        return;
      }

      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: result.ufsUrl, avatarFileKey: result.key }),
      });

      if (!res.ok) {
        setAvatarError(await responseError(res, "Failed to upload photo."));
        setAvatarState("error");
        return;
      }
      const data = await res.json();
      setAvatarUrl(data.avatarUrl);
      setAvatarPreview(null);
      setAvatarState("idle");
      router.refresh();
    } catch {
      setAvatarError("Network error. Please try again.");
      setAvatarState("error");
    } finally {
      setAvatarState((state) => state === "uploading" ? "error" : state);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarState("uploading");
    setAvatarError("");
    try {
      const res = await fetch("/api/users/me/avatar", { method: "DELETE" });
      if (!res.ok) {
        setAvatarError(await responseError(res, "Failed to remove photo."));
        setAvatarState("error");
        return;
      }
      setAvatarUrl(null);
      setAvatarPreview(null);
      setAvatarState("idle");
      router.refresh();
    } catch {
      setAvatarError("Network error. Please try again.");
      setAvatarState("error");
    } finally {
      setAvatarState((state) => state === "uploading" ? "error" : state);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setProfileError("");
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = { isProfilePublic };

    const name = String(form.get("name") ?? "").trim();
    if (name) body.name = name;

    for (const field of PROFILE_FIELDS) {
      body[field.name] = String(form.get(field.name) ?? "").trim();
    }
    body.style = String(form.get("style") ?? "").trim();
    body.experience = String(form.get("experience") ?? "").trim();
    body.skills = skills;

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setProfileError(await responseError(res, "Failed to save profile."));
        setStatus("error");
        return;
      }
      setStatus("saved");
      router.refresh();
    } catch {
      setProfileError("Network error. Please try again.");
      setStatus("error");
    } finally {
      setStatus((current) => current === "saving" ? "error" : current);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="border border-line bg-paper-soft p-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="font-display text-title-md uppercase">My profile</p>
        {status === "saved" && (
          <span className="font-mono text-[0.7rem] uppercase text-accent">Saved</span>
        )}
         {status === "error" && (
           <span className="font-mono text-[0.7rem] uppercase text-red-600">{profileError || "Failed to save"}</span>
         )}
      </div>
      <p className="mt-xs text-body-sm text-ink-muted">
        These details are sent to organizers with every registration.
      </p>

      <div className="mt-lg flex flex-wrap items-center gap-md">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Profile picture"
            className="h-20 w-20 rounded-full border border-line object-cover"
          />
        ) : avatarPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarPreview}
            alt="Profile preview"
            className="h-20 w-20 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-paper font-display text-title-md uppercase text-ink-muted">
            {profile.name?.charAt(0) ?? "?"}
          </div>
        )}
        <div className="space-y-sm">
          <label className="block cursor-pointer border border-line px-md py-xs font-mono text-[0.7rem] uppercase text-ink-muted transition-colors hover:border-accent hover:text-accent">
            {avatarState === "uploading" ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handleAvatarFile(e.target.files?.[0])}
            />
          </label>
          {avatarUrl ? (
            <button
              type="button"
             onClick={() => void handleRemoveAvatar()}
               disabled={avatarState === "uploading"}
               className="block border border-line px-md py-xs font-mono text-[0.7rem] uppercase text-ink-muted transition-colors hover:border-red-500 hover:text-red-500"
            >
              Remove photo
            </button>
          ) : null}
           {avatarState === "error" ? (
             <p className="font-mono text-[0.65rem] uppercase text-red-600">
               {avatarError || "Only JPG, PNG, or WebP up to 5MB"}
             </p>
          ) : null}
        </div>
      </div>

      <div className="mt-lg">
        <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Profile visibility</span>
        <div className="mt-xs grid gap-sm sm:grid-cols-2">
          <label className="block cursor-pointer border border-line bg-paper px-md py-sm">
            <input
              type="radio"
              name="visibility"
              className="mr-sm"
              checked={isProfilePublic}
              onChange={() => setIsProfilePublic(true)}
            />
            <span className="text-body-sm font-bold uppercase">Public</span>
            <p className="mt-xs text-body-sm text-ink-muted">
              Shown in the public artist directory for visitors.
            </p>
          </label>
          <label className="block cursor-pointer border border-line bg-paper px-md py-sm">
            <input
              type="radio"
              name="visibility"
              className="mr-sm"
              checked={!isProfilePublic}
              onChange={() => setIsProfilePublic(false)}
            />
            <span className="text-body-sm font-bold uppercase">Private</span>
            <p className="mt-xs text-body-sm text-ink-muted">
              Hidden from visitors. Visible to logged-in organizers and artists.
            </p>
          </label>
        </div>
      </div>

      <div className="mt-lg grid gap-md sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Name</span>
          <input
            className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
            name="name"
            defaultValue={profile.name ?? ""}
            placeholder="Stage name"
          />
        </label>
        <div className="sm:col-span-2">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">
            Skills — what do you do? (used for gig matching)
          </span>
          <div className="mt-xs flex flex-wrap gap-xs">
            {SKILLS.map((skill) => {
              const active = skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`border px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] transition-colors ${
                    active
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line text-ink-muted hover:border-accent"
                  }`}
                >
                  {SKILL_LABELS[skill]}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Style — dance style (optional)</span>
          <select
            className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
            name="style"
            defaultValue={profile.style ?? ""}
          >
            <option value="">Not a dancer / skip</option>
            {profile.style && !isDanceStyle(profile.style) ? (
              <option value={profile.style}>{profile.style} (current)</option>
            ) : null}
            {DANCE_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Years of experience</span>
          <select
            className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
            name="experience"
            defaultValue={profile.experience ?? ""}
          >
            <option value="">Select years</option>
            {EXPERIENCE_OPTIONS.map((years) => (
              <option key={years} value={years}>
                {years === "0" ? "Under 1 year" : `${years} ${years === "1" ? "year" : "years"}`}
              </option>
            ))}
          </select>
        </label>
        {PROFILE_FIELDS.map((field) => (
          <label key={field.name} className="block">
            <span className="font-mono text-[0.7rem] uppercase text-ink-muted">
              {field.label}
            </span>
            <input
              className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
              name={field.name}
              defaultValue={profile[field.name] ?? ""}
              placeholder={field.placeholder}
            />
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-lg border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
      >
        {status === "saving" ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
