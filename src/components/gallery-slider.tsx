"use client";

import { useRef } from "react";
import Link from "next/link";

export type GallerySlide = {
  id: string;
  type: "PHOTO" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  eventTitle: string | null;
  eventSlug: string | null;
};

export function GallerySlider({ items }: { items: GallerySlide[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  if (items.length === 0) return null;

  function scrollBy(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.min(track.clientWidth * 0.8, 640), behavior: "smooth" });
  }

  return (
    <section className="border-b border-line bg-paper-soft" aria-label="Moments from past events">
      <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
        <div className="flex flex-wrap items-end justify-between gap-md">
          <div>
            <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
              Moments
            </p>
            <h2 className="mt-md font-display text-display-lg uppercase">
              From the floor
            </h2>
            <p className="mt-sm max-w-2xl text-body-sm text-ink-muted">
              Photos and videos from past CYPHR events.
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Previous photos"
              className="border border-line px-md py-sm font-mono text-body-sm text-ink transition-colors hover:border-accent hover:text-accent"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Next photos"
              className="border border-line px-md py-sm font-mono text-body-sm text-ink transition-colors hover:border-accent hover:text-accent"
            >
              →
            </button>
            <Link
              href="/gallery"
              className="border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
            >
              Full gallery
            </Link>
          </div>
        </div>

        <div
          ref={trackRef}
          className="mt-lg flex snap-x snap-mandatory gap-md overflow-x-auto pb-sm"
        >
          {items.map((item) => (
            <Link
              key={item.id}
              href="/gallery"
              className="group relative h-64 w-80 shrink-0 snap-start overflow-hidden rounded-lg border border-line bg-paper-raised md:h-72 md:w-[28rem]"
              title={item.title ?? "Gallery image"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.type === "VIDEO" ? (item.thumbnailUrl ?? item.url) : item.url}
                alt={item.title ?? "Past event photo"}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-md pt-xl">
                {item.title ? (
                  <span className="block truncate font-display text-title-md uppercase text-white">
                    {item.title}
                  </span>
                ) : null}
                {item.eventTitle ? (
                  <span className="mt-xs block font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/80">
                    {item.eventTitle}
                  </span>
                ) : null}
              </span>
              {item.type === "VIDEO" ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-paper/85 font-mono text-body-lg text-ink">
                    ▶
                  </span>
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
