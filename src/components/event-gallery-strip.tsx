import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";

export type GalleryTeaserItem = {
  id: string;
  type: "PHOTO" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
};

export function EventGalleryStrip({ items }: { items: GalleryTeaserItem[] }) {
  if (items.length === 0) return null;

  return (
    <section id="gallery" aria-label="Gallery" className="scroll-mt-24">
      <SectionHeading
        eyebrow="Moments"
        title="Gallery"
        action={
          <Link
            href="/gallery"
            className="border border-line px-md py-sm font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            Full gallery →
          </Link>
        }
      />
      <div className="flex snap-x snap-mandatory gap-md overflow-x-auto pb-sm">
        {items.map((item) => (
          <Link
            key={item.id}
            href="/gallery"
            className="group relative h-48 w-72 shrink-0 snap-start overflow-hidden rounded-lg border border-line bg-paper-raised"
            title={item.title ?? "Gallery photo"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.type === "VIDEO" ? (item.thumbnailUrl ?? item.url) : item.url}
              alt={item.title ?? "Event gallery image"}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
            {item.type === "VIDEO" ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper/80 font-mono text-body-md text-ink">
                  ▶
                </span>
              </span>
            ) : null}
            {item.title ? (
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-sm py-sm pt-lg font-mono text-[0.6rem] uppercase tracking-[0.1em] text-white">
                {item.title}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
