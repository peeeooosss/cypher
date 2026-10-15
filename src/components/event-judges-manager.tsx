"use client";

import { useState } from "react";
import { JudgePhotoUpload } from "@/components/judge-photo-upload";
import { responseError } from "@/lib/client-error";
import { useToast } from "@/components/ui/toast";

export type EventJudgeRecord = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photoUrl: string | null;
  photoFileKey: string | null;
  socialLinks: unknown;
  displayOrder: number;
  isPublic: boolean;
};

function socialString(links: unknown, key: string): string {
  if (typeof links !== "object" || links === null) return "";
  const value = (links as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

type FormState = {
  name: string;
  title: string;
  bio: string;
  photoUrl: string | null;
  photoFileKey: string | null;
  instagram: string;
  youtube: string;
  displayOrder: string;
  isPublic: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  title: "",
  bio: "",
  photoUrl: null,
  photoFileKey: null,
  instagram: "",
  youtube: "",
  displayOrder: "0",
  isPublic: true,
};

function toForm(judge: EventJudgeRecord): FormState {
  return {
    name: judge.name,
    title: judge.title ?? "",
    bio: judge.bio ?? "",
    photoUrl: judge.photoUrl,
    photoFileKey: judge.photoFileKey,
    instagram: socialString(judge.socialLinks, "instagram"),
    youtube: socialString(judge.socialLinks, "youtube"),
    displayOrder: String(judge.displayOrder),
    isPublic: judge.isPublic,
  };
}

export function EventJudgesManager({
  eventId,
  initialJudges,
  onChanged,
}: {
  eventId: string;
  initialJudges: EventJudgeRecord[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [judges, setJudges] = useState<EventJudgeRecord[]>(initialJudges);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function startNew() {
    setEditingId("new");
    setForm(EMPTY_FORM);
  }

  function startEdit(judge: EventJudgeRecord) {
    setEditingId(judge.id);
    setForm(toForm(judge));
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function buildBody() {
    const socialLinks: Record<string, string> = {};
    if (form.instagram.trim()) socialLinks.instagram = form.instagram.trim();
    if (form.youtube.trim()) socialLinks.youtube = form.youtube.trim();
    return {
      name: form.name.trim(),
      title: form.title.trim() || null,
      bio: form.bio.trim() || null,
      photoUrl: form.photoUrl,
      photoFileKey: form.photoFileKey,
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      displayOrder: Number(form.displayOrder) || 0,
      isPublic: form.isPublic,
    };
  }

  async function handleSave(isNew: boolean) {
    if (!form.name.trim()) {
      toast("Give the judge a name", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(isNew ? `/api/events/${eventId}/judges` : `/api/events/${eventId}/judges/${editingId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      if (!res.ok) throw new Error(await responseError(res, "Failed to save judge"));
      const saved = (await res.json()) as EventJudgeRecord;
      setJudges((prev) => {
        const next = isNew ? [...prev, saved] : prev.map((j) => (j.id === saved.id ? saved : j));
        return next.sort((a, b) => a.displayOrder - b.displayOrder);
      });
      cancelEdit();
      onChanged();
      toast(isNew ? "Judge added" : "Judge saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save judge", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(judgeId: string) {
    if (!window.confirm("Remove this judge from the event card?")) return;
    try {
      const res = await fetch(`/api/events/${eventId}/judges/${judgeId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await responseError(res, "Failed to delete judge"));
      setJudges((prev) => prev.filter((j) => j.id !== judgeId));
      onChanged();
      toast("Judge removed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete judge", "error");
    }
  }

  async function togglePublic(judge: EventJudgeRecord) {
    try {
      const res = await fetch(`/api/events/${eventId}/judges/${judge.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !judge.isPublic }),
      });
      if (!res.ok) throw new Error(await responseError(res, "Failed to update judge"));
      const saved = (await res.json()) as EventJudgeRecord;
      setJudges((prev) => prev.map((j) => (j.id === saved.id ? saved : j)));
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update judge", "error");
    }
  }

  return (
    <div className="border border-line p-lg">
      <div className="flex flex-wrap items-center justify-end gap-md">
        <button
          type="button"
          onClick={startNew}
          className="border border-accent bg-accent px-md py-sm font-bold uppercase text-paper"
        >
          + Add judge
        </button>
      </div>

      {editingId === "new" ? (
        <div className="mt-lg border border-accent bg-paper-soft p-lg">
          <p className="font-display text-title-md uppercase">New judge</p>
          <JudgeForm
            form={form}
            setForm={setForm}
            saving={saving}
            onSave={() => void handleSave(true)}
            onCancel={cancelEdit}
          />
        </div>
      ) : null}

      <div className="mt-lg space-y-sm">
        {judges.length === 0 && editingId !== "new" ? (
          <p className="border border-line p-lg text-ink-muted">No judges yet. Add the first one.</p>
        ) : null}
        {judges.map((judge) =>
          editingId === judge.id ? (
            <div key={judge.id} className="border border-accent bg-paper-soft p-lg">
              <p className="font-display text-title-md uppercase">Edit judge</p>
              <JudgeForm
                form={form}
                setForm={setForm}
                saving={saving}
                onSave={() => void handleSave(false)}
                onCancel={cancelEdit}
              />
            </div>
          ) : (
            <div key={judge.id} className="flex flex-wrap items-center justify-between gap-md border border-line bg-paper-soft px-md py-sm">
              <div className="flex min-w-0 items-center gap-md">
                {judge.photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={judge.photoUrl} alt={judge.name} className="h-12 w-12 shrink-0 rounded-full border border-line object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-paper font-display text-title-md uppercase text-ink-muted">
                    {judge.name.charAt(0) ?? "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold uppercase">{judge.name}</p>
                  <p className="font-mono text-[0.65rem] uppercase text-ink-muted">
                    {[judge.title, judge.isPublic ? "Public" : "Hidden"].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <div className="flex gap-sm">
                <button
                  type="button"
                  onClick={() => void togglePublic(judge)}
                  className="border border-line px-md py-xs text-[0.7rem] font-bold uppercase hover:border-accent"
                >
                  {judge.isPublic ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(judge)}
                  className="border border-line px-md py-xs text-[0.7rem] font-bold uppercase hover:border-accent"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(judge.id)}
                  className="border border-line px-md py-xs text-[0.7rem] font-bold uppercase text-accent hover:border-accent"
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function JudgeForm({
  form,
  setForm,
  saving,
  onSave,
  onCancel,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });
  return (
    <div className="mt-md space-y-sm">
      <div className="grid gap-sm md:grid-cols-2">
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Judge name"
        />
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Title (e.g. Head Judge, Guest Judge)"
        />
      </div>
      <textarea
        className="w-full border border-line bg-paper px-md py-sm text-body-sm"
        value={form.bio}
        onChange={(e) => set({ bio: e.target.value })}
        placeholder="Short bio — style, crew, achievements..."
        rows={3}
      />
      <JudgePhotoUpload
        initial={form.photoUrl}
        onChange={(photoUrl, photoFileKey) => set({ photoUrl, photoFileKey })}
      />
      <div className="grid gap-sm md:grid-cols-3">
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm"
          value={form.instagram}
          onChange={(e) => set({ instagram: e.target.value })}
          placeholder="Instagram URL"
        />
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm"
          value={form.youtube}
          onChange={(e) => set({ youtube: e.target.value })}
          placeholder="YouTube URL"
        />
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm"
          type="number"
          min={0}
          value={form.displayOrder}
          onChange={(e) => set({ displayOrder: e.target.value })}
          placeholder="Order"
        />
      </div>
      <label className="flex items-center gap-sm">
        <input
          type="checkbox"
          checked={form.isPublic}
          onChange={(e) => set({ isPublic: e.target.checked })}
          className="border border-line bg-paper"
        />
        <span className="font-mono text-sm">Show on public event page</span>
      </label>
      <div className="flex gap-sm">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="border border-accent bg-accent px-md py-sm font-bold uppercase text-paper disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save judge"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-line px-md py-sm font-bold uppercase hover:border-accent"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
