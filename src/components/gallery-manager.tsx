"use client";

import { useEffect, useRef, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { responseError } from "@/lib/client-error";
import { useToast } from "@/components/ui/toast";
import { UploadProgress, type UploadStatus } from "@/components/ui/upload-progress";

type GalleryRecord = {
  id: string;
  title: string | null;
  caption: string | null;
  type: "PHOTO" | "VIDEO";
  url: string;
  fileKey: string | null;
  thumbnailUrl: string | null;
  sourceLink: string | null;
  eventId: string | null;
  isFeaturedHomepage: boolean;
  displayOrder: number;
  isPublished: boolean;
  event: { id: string; title: string; slug: string } | null;
};

export function GalleryManager() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<GalleryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);
  const { startUpload } = useUploadThing("galleryImageUploader", {
    uploadProgressGranularity: "fine",
    onUploadBegin: () => {
      setUploadStatus("uploading");
      setUploadProgress(0);
    },
    onUploadProgress: (p) => setUploadProgress(p),
    onUploadError: (e) => {
      setUploadStatus("error");
      toast(e.message || "Upload failed.", "error");
    },
  });

  async function load() {
    try {
      const res = await fetch("/api/admin/gallery");
      if (!res.ok) throw new Error(await responseError(res, "Failed to load gallery"));
      setItems(await res.json());
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to load gallery", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/gallery");
        if (!res.ok) throw new Error(await responseError(res, "Failed to load gallery"));
        const data = (await res.json()) as GalleryRecord[];
        if (active) setItems(data);
      } catch (err) {
        if (active) toast(err instanceof Error ? err.message : "Failed to load gallery", "error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = [...files].filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      toast("Choose image files.", "error");
      return;
    }
    setUploading(true);
    setUploadStatus("uploading");
    setUploadProgress(0);
    try {
      const uploaded = await startUpload(list);
      if (!uploaded || uploaded.length === 0) {
        setUploadStatus("error");
        toast("Upload failed. Please try again.", "error");
        return;
      }
      setUploadStatus("saving");
      for (const file of uploaded) {
        await fetch("/api/admin/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "PHOTO", url: file.ufsUrl, fileKey: file.key }),
        });
      }
      setUploadStatus("success");
      toast(`${uploaded.length} photo${uploaded.length === 1 ? "" : "s"} added`, "success");
      await load();
    } catch (err) {
      setUploadStatus("error");
      toast(err instanceof Error ? err.message : "Upload failed.", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    setSavingVideo(true);
    try {
      const isLink = /youtube\.com|youtu\.be|vimeo\.com|instagram\.com|drive\.google\.com/.test(videoUrl);
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "VIDEO",
          title: videoTitle.trim() || null,
          url: videoUrl.trim(),
          ...(isLink ? { sourceLink: videoUrl.trim() } : {}),
        }),
      });
      if (!res.ok) throw new Error(await responseError(res, "Failed to add video"));
      setVideoUrl("");
      setVideoTitle("");
      toast("Video added", "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add video", "error");
    } finally {
      setSavingVideo(false);
    }
  }

  async function patchItem(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/admin/gallery/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await responseError(res, "Failed to update item"));
      const saved = (await res.json()) as GalleryRecord;
      setItems((prev) => prev.map((item) => (item.id === saved.id ? { ...item, ...saved, event: item.event } : item)));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update item", "error");
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Delete this gallery item?")) return;
    try {
      const res = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await responseError(res, "Failed to delete item"));
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast("Deleted", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete item", "error");
    }
  }

  if (loading) return <p className="text-body-sm text-ink-muted">Loading gallery…</p>;

  return (
    <div className="space-y-xl">
      <div className="grid gap-md lg:grid-cols-2">
        <div className="border border-line p-lg">
          <p className="font-display text-title-md uppercase">Upload photos</p>
          <p className="mt-xs text-body-sm text-ink-muted">
            JPG, PNG or WebP, up to 5MB each. Photos appear on the gallery page immediately.
          </p>
          <label className="mt-md block cursor-pointer border border-dashed border-line px-md py-lg text-center text-body-sm text-ink-muted transition-colors hover:border-accent">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em]">
              {uploading ? "Uploading..." : "Choose photos"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </label>
          <UploadProgress
            status={uploadStatus}
            progress={uploadProgress}
            successLabel="Photos uploaded"
          />
        </div>

        <form className="border border-line p-lg" onSubmit={(e) => void handleAddVideo(e)}>
          <p className="font-display text-title-md uppercase">Add video</p>
          <p className="mt-xs text-body-sm text-ink-muted">
            Paste a YouTube / Vimeo / Instagram / Drive link, or a direct MP4 URL.
          </p>
          <div className="mt-md space-y-sm">
            <input
              className="w-full border border-line bg-paper px-md py-sm text-body-sm"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Video title (optional)"
            />
            <input
              className="w-full border border-line bg-paper px-md py-sm text-body-sm"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://…"
            />
            <button
              type="submit"
              disabled={savingVideo || !videoUrl.trim()}
              className="border border-accent bg-accent px-md py-sm font-bold uppercase text-paper disabled:opacity-60"
            >
              {savingVideo ? "Adding..." : "Add video"}
            </button>
          </div>
        </form>
      </div>

      <div>
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
          {items.length} item{items.length === 1 ? "" : "s"}
        </p>
        <div className="mt-md grid gap-md sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="border border-line bg-paper-soft p-md">
              <div className="relative aspect-[4/3] overflow-hidden bg-paper-raised">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.type === "VIDEO" ? (item.thumbnailUrl ?? item.url) : item.url}
                  alt={item.title ?? "Gallery item"}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-sm top-sm border border-line bg-paper/85 px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-ink">
                  {item.type}
                </span>
              </div>
              <p className="mt-sm truncate font-bold uppercase">{item.title ?? "(untitled)"}</p>
              <div className="mt-sm flex flex-wrap gap-xs">
                <button
                  type="button"
                  onClick={() => void patchItem(item.id, { isFeaturedHomepage: !item.isFeaturedHomepage })}
                  className={`border px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] ${
                    item.isFeaturedHomepage
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line text-ink-muted hover:border-accent"
                  }`}
                >
                  {item.isFeaturedHomepage ? "★ Homepage" : "Feature"}
                </button>
                <button
                  type="button"
                  onClick={() => void patchItem(item.id, { isPublished: !item.isPublished })}
                  className="border border-line px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-ink-muted hover:border-accent"
                >
                  {item.isPublished ? "Hide" : "Publish"}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteItem(item.id)}
                  className="border border-line px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-accent hover:border-accent"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
