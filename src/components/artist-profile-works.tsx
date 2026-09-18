"use client";

import { useState } from "react";
import { VideoModal } from "@/components/video-modal";
import type { Work } from "@/components/artist-works";

export type ArtistProfileWork = Work;

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  instagram: "Instagram",
  other: "Video",
};

interface ArtistProfileWorksProps {
  works: Work[];
}

export function ArtistProfileWorks({ works }: ArtistProfileWorksProps) {
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);

  if (works.length === 0) {
    return (
      <div className="border border-line bg-paper-soft p-xl text-center">
        <p className="text-body-sm text-ink-muted">No works published yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {works.map((work) => (
          <article
            key={work.id}
            className="group border border-line bg-paper-soft relative transition-colors hover:border-accent cursor-pointer"
            onClick={() => setSelectedWork(work)}
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
                <div className="opacity-0 group-hover:opacity-100 transition-opacity p-3 bg-accent rounded-full hover:bg-accent-dark">
                  <svg className="h-6 w-6 text-paper" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
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

      <VideoModal
        isOpen={!!selectedWork}
        onClose={() => setSelectedWork(null)}
        videoUrl={selectedWork?.videoUrl ?? ""}
        title={selectedWork?.title ?? "Preview"}
      />
    </div>
  );
}