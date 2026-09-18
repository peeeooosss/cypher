"use client";

import { useState, useEffect } from "react";
import { VideoModal } from "@/components/video-modal";
import { useUploadThing } from "@/lib/uploadthing";

export interface Work {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  platform: string | null;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  instagram: "Instagram",
  other: "Video",
};

function detectPlatform(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  if (url.includes("instagram.com")) return "instagram";
  return "other";
}

function extractVideoId(url: string, platform: string): string | null {
  if (platform === "youtube") {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    return match ? match[1] : null;
  }
  if (platform === "vimeo") {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  }
  return null;
}

function getThumbnailUrl(url: string, platform: string): string | null {
  const id = extractVideoId(url, platform);
  if (!id) return null;
  if (platform === "youtube") return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  if (platform === "vimeo") return null; // Would need API
  return null;
}

export function ArtistWorks() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [modalVideoUrl, setModalVideoUrl] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [modalThumbnail, setModalThumbnail] = useState<string | null>(null);
  const [modalError, setModalError] = useState("");
  const [thumbnailState, setThumbnailState] = useState<"idle" | "uploading" | "error">("idle");
  const [thumbnailError, setThumbnailError] = useState("");

  const { startUpload } = useUploadThing("avatarUploader", {
    onUploadError: (e) => setThumbnailError(e.message || "Failed to upload thumbnail"),
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/artist/works");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setWorks(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleVideoUrlChange(url: string) {
    setModalVideoUrl(url);
    const platform = detectPlatform(url);
    const thumb = getThumbnailUrl(url, platform);
    if (thumb) setModalThumbnail(thumb);
  }

  async function handleThumbnailUpload(file: File | undefined) {
    setThumbnailState("idle");
    setThumbnailError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setThumbnailState("error");
      setThumbnailError("Only JPG, PNG, or WebP up to 5MB");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setThumbnailState("error");
      setThumbnailError("Only JPG, PNG, or WebP up to 5MB");
      return;
    }

    setThumbnailState("uploading");
    try {
      const uploaded = await startUpload([file]);
      const result = uploaded?.[0];
      if (!result) throw new Error("Failed to upload");
      setModalThumbnail(result.ufsUrl);
      setThumbnailState("idle");
    } catch {
      setThumbnailState("error");
      setThumbnailError("Network error. Please try again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setModalError("");
    if (!modalVideoUrl.trim() || !modalTitle.trim()) {
      setModalError("Title and video URL are required");
      return;
    }

    const isEditing = !!editingWork;
    const url = isEditing ? `/api/artist/works/${editingWork.id}` : "/api/artist/works";
    const method = isEditing ? "PATCH" : "POST";

    setSaving(editingWork?.id ?? "new");
    try {
      const platform = detectPlatform(modalVideoUrl);
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: modalTitle.trim(),
          description: modalDescription.trim() || null,
          videoUrl: modalVideoUrl.trim(),
          thumbnailUrl: modalThumbnail,
          platform,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setModalError(err.message ?? "Failed to save");
        return;
      }

      if (isEditing) {
        setWorks(works.map((w) => (w.id === editingWork.id ? { ...w, title: modalTitle, description: modalDescription, videoUrl: modalVideoUrl, thumbnailUrl: modalThumbnail, platform } : w)));
      } else {
        const newWork = await res.json();
        setWorks([...works, newWork]);
      }
      closeModal();
    } catch {
      setModalError("Network error. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this work?")) return;
    try {
      const res = await fetch(`/api/artist/works/${id}`, { method: "DELETE" });
      if (res.ok) setWorks(works.filter((w) => w.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  function openAddModal() {
    setEditingWork(null);
    setModalVideoUrl("");
    setModalTitle("");
    setModalDescription("");
    setModalThumbnail(null);
    setModalError("");
    setShowAddModal(true);
  }

  function openEditModal(work: Work) {
    setEditingWork(work);
    setModalVideoUrl(work.videoUrl);
    setModalTitle(work.title);
    setModalDescription(work.description ?? "");
    setModalThumbnail(work.thumbnailUrl);
    setModalError("");
    setShowAddModal(true);
  }

  function closeModal() {
    setShowAddModal(false);
    setEditingWork(null);
    setModalVideoUrl("");
    setModalTitle("");
    setModalDescription("");
    setModalThumbnail(null);
    setModalError("");
    setThumbnailState("idle");
    setThumbnailError("");
  }

  const videoModalUrl = editingWork?.videoUrl ?? modalVideoUrl;
  const videoModalTitle = editingWork?.title ?? modalTitle;

  return (
    <section className="mt-section">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">My works</p>
        <button
          onClick={openAddModal}
          disabled={saving !== null}
          className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
        >
          Add work
        </button>
      </div>

      {loading ? (
        <div className="mt-lg grid gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-line bg-paper-soft p-lg animate-pulse-soft">
              <div className="aspect-video bg-line rounded-lg mb-md" />
              <div className="h-4 bg-line rounded w-3/4 mb-sm" />
              <div className="h-3 bg-line rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : works.length === 0 ? (
        <div className="mt-lg border border-line bg-paper-soft p-xl text-center">
          <p className="text-body-sm text-ink-muted">No works added yet.</p>
          <p className="mt-sm text-[0.75rem] text-ink-muted">Add your performance videos, reels, or portfolio pieces.</p>
          <button
            onClick={openAddModal}
            className="mt-md border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper"
          >
            Add your first work
          </button>
        </div>
      ) : (
        <div className="mt-lg grid gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {works.map((work) => (
            <article
              key={work.id}
              className="group border border-line bg-paper-soft relative transition-colors hover:border-accent"
            >
              <div className="relative aspect-video overflow-hidden bg-line">
                {work.thumbnailUrl ? (
                  <img
                    src={work.thumbnailUrl}
                    alt={work.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display text-title-lg text-ink-muted">
                    {PLATFORM_LABELS[work.platform ?? "other"] ?? "Video"}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <button
                    onClick={() => {
                      setModalVideoUrl(work.videoUrl);
                      setModalTitle(work.title);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-3 bg-accent rounded-full hover:bg-accent-dark"
                    aria-label={`Watch ${work.title}`}
                  >
                    <svg className="h-6 w-6 text-paper" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(work)}
                    className="p-2 bg-paper/90 backdrop-blur rounded-full text-ink hover:bg-paper hover:text-accent transition-colors"
                    aria-label="Edit work"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 0 0-4.5-4.5H5.25A2.25 2.25 0 0 0 3 9.75v4.5A2.25 2.25 0 0 0 5.25 16.5H12a4.5 4.5 0 0 0 4.5-4.5Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(work.id)}
                    className="p-2 bg-paper/90 backdrop-blur rounded-full text-ink hover:bg-red-600 hover:text-paper transition-colors"
                    aria-label="Delete work"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-4.386-.324m-4.386.324L8.84 5.79" />
                    </svg>
                  </button>
                </div>
                {!work.isPublished && (
                  <span className="absolute bottom-2 left-2 px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] bg-amber-600/90 text-paper rounded-sm">
                    Draft
                  </span>
                )}
              </div>
              <div className="p-md">
                <h4 className="font-display text-title-md uppercase truncate">{work.title}</h4>
                {work.description && (
                  <p className="mt-xs text-body-sm text-ink-muted line-clamp-2">{work.description}</p>
                )}
                <div className="mt-sm flex items-center justify-between">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-accent">
                    {PLATFORM_LABELS[work.platform ?? "other"] ?? "Video"}
                  </span>
                  <span className="font-mono text-[0.6rem] text-ink-muted">
                    {new Date(work.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <VideoModal
        isOpen={showAddModal && !!videoModalUrl}
        onClose={() => {}}
        videoUrl={videoModalUrl}
        title={videoModalTitle || "Preview"}
      />

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in" onClick={closeModal}>
          <div className="relative w-full max-w-2xl mx-md max-h-[90vh] overflow-y-auto bg-paper rounded-xl shadow-card-hover animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit} className="p-lg">
              <div className="flex items-center justify-between mb-lg">
                <h3 className="font-display text-title-md uppercase">{editingWork ? "Edit work" : "Add work"}</h3>
                <button type="button" onClick={closeModal} className="p-2 text-ink-muted hover:text-accent transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {modalError && (
                <div className="mb-md p-sm bg-red-600/10 border border-red-600 text-red-600 font-mono text-[0.65rem] uppercase rounded-sm">
                  {modalError}
                </div>
              )}

              <div className="mb-md">
                <label className="block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted mb-xs">
                  Video URL (YouTube, Vimeo, Instagram)
                </label>
                <input
                  type="url"
                  value={modalVideoUrl}
                  onChange={(e) => handleVideoUrlChange(e.target.value)}
                  className="w-full border border-line bg-paper-soft px-md py-sm text-body-sm"
                  placeholder="https://youtube.com/watch?v=... or https://instagram.com/reel/..."
                  required
                />
              </div>

              <div className="mb-md">
                <label className="block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted mb-xs">
                  Title
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full border border-line bg-paper-soft px-md py-sm text-body-sm"
                  placeholder="Work title"
                  required
                  maxLength={200}
                />
              </div>

              <div className="mb-md">
                <label className="block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted mb-xs">
                  Description (optional)
                </label>
                <textarea
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="w-full border border-line bg-paper-soft px-md py-sm text-body-sm min-h-[80px] resize-y"
                  placeholder="Brief description of this work..."
                  maxLength={2000}
                />
              </div>

              <div className="mb-md">
                <label className="block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted mb-xs">
                  Thumbnail (optional — auto-fetched from YouTube)
                </label>
                <div className="space-y-sm">
                  {modalThumbnail && (
                    <div className="relative w-full max-w-xs">
                      <img src={modalThumbnail} alt="Thumbnail preview" className="w-full aspect-video object-cover rounded-lg border border-line" />
                      <button
                        type="button"
                        onClick={() => setModalThumbnail(null)}
                        className="absolute top-2 right-2 p-1 bg-red-600/90 text-paper rounded-full hover:bg-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <label className="block cursor-pointer border border-line bg-paper-soft px-md py-sm text-center font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted transition-colors hover:border-accent hover:text-accent">
                    {thumbnailState === "uploading" ? "Uploading…" : "Upload custom thumbnail"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleThumbnailUpload(e.target.files?.[0])}
                    />
                  </label>
                  {thumbnailState === "error" && (
                    <p className="font-mono text-[0.65rem] uppercase text-red-600">{thumbnailError}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-sm pt-md border-t border-line">
                <button
                  type="submit"
                  disabled={saving !== null}
                  className="flex-1 border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
                >
                  {saving ? "Saving…" : editingWork ? "Save changes" : "Add work"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-line px-lg py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted hover:border-accent hover:text-accent"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}