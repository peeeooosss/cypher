"use client";

import { useState } from "react";
import Link from "next/link";
import { VideoModal } from "@/components/video-modal";

export type GalleryGridItem = {
  id: string;
  type: "PHOTO" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
  sourceLink: string | null;
  title: string | null;
  caption: string | null;
  event: { id: string; title: string; slug: string } | null;
};

export function GalleryGrid({ items }: { items: GalleryGridItem[] }) {
  const [active, setActive] = useState<GalleryGridItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="border border-line p-xl text-center">
        <p className="font-display text-title-md uppercase text-ink-muted">Nothing here yet</p>
        <p className="mt-sm text-body-sm text-ink-muted">
          Photos and videos from past events will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item)}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-paper-raised text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-raised"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.type === "VIDEO" ? (item.thumbnailUrl ?? item.url) : item.url}
              alt={item.title ?? "Gallery image"}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
            {item.type === "VIDEO" ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper/85 font-mono text-body-md text-ink">
                  ▶
                </span>
              </span>
            ) : null}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-md pt-xl">
              {item.title ? (
                <span className="block truncate font-display text-title-sm uppercase text-white">
                  {item.title}
                </span>
              ) : null}
              {item.event ? (
                <span className="mt-xs block font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/80">
                  {item.event.title}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      {active && active.type === "VIDEO" ? (
        <VideoModal
          isOpen
          onClose={() => setActive(null)}
          videoUrl={active.sourceLink ?? active.url}
          title={active.title ?? "Gallery video"}
          description={[
            active.caption,
            active.event ? `From ${active.event.title}` : null,
          ]
            .filter(Boolean)
            .join(" — ")}
        />
      ) : null}

      {active && active.type === "PHOTO" ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-md"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={active.title ?? "Gallery preview"}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-lg border border-line bg-paper"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.url} alt={active.title ?? "Gallery photo"} className="max-h-[75vh] w-full object-contain bg-black" />
            <div className="flex flex-wrap items-center justify-between gap-md p-lg">
              <div className="min-w-0">
                {active.title ? (
                  <p className="font-display text-title-md uppercase">{active.title}</p>
                ) : null}
                {active.caption ? (
                  <p className="mt-xs text-body-sm text-ink-muted">{active.caption}</p>
                ) : null}
                {active.event ? (
                  <Link
                    href={`/events/${active.event.slug}`}
                    className="mt-sm inline-block font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em] text-accent hover:underline"
                  >
                    {active.event.title} →
                  </Link>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="border border-line px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink hover:border-accent hover:text-accent"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
