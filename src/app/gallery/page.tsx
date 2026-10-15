import Link from "next/link";
import type { Metadata } from "next";
import { GalleryGrid } from "@/components/gallery-grid";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery — CYPHR",
  description: "Photos and videos from past CYPHR dance battles and competitions.",
};

type SearchParams = Promise<{ type?: string }>;

export default async function GalleryPage({ searchParams }: { searchParams: SearchParams }) {
  const { type } = await searchParams;
  const filter = type === "VIDEO" ? "VIDEO" : type === "PHOTO" ? "PHOTO" : undefined;

  const [galleryItems, eventPhotos] = await Promise.all([
    prisma.galleryItem.findMany({
      where: { isPublished: true, ...(filter ? { type: filter } : {}) },
      include: { event: { select: { id: true, title: true, slug: true } } },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      take: 120,
    }),
    filter === "VIDEO"
      ? []
      : prisma.eventPhoto.findMany({
          where: { isPublic: true },
          include: { event: { select: { id: true, title: true, slug: true } } },
          orderBy: { createdAt: "desc" },
          take: 60,
        }),
  ]);

  const items = [
    ...galleryItems,
    ...eventPhotos.map((photo) => ({
      id: photo.id,
      type: "PHOTO" as const,
      url: photo.photoUrl,
      thumbnailUrl: null,
      sourceLink: null,
      title: photo.caption,
      caption: photo.caption,
      event: photo.event,
    })),
  ].slice(0, 180);

  const tabs = [
    { label: "All", href: "/gallery", active: !filter },
    { label: "Photos", href: "/gallery?type=PHOTO", active: filter === "PHOTO" },
    { label: "Videos", href: "/gallery?type=VIDEO", active: filter === "VIDEO" },
  ];

  return (
    <main className="min-h-screen bg-paper">
      <section className="mx-auto max-w-7xl px-md py-section md:px-xl">
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Moments</p>
        <h1 className="mt-lg font-display text-display-lg uppercase">Gallery</h1>
        <p className="mt-md max-w-2xl text-body-md text-ink-muted">
          Photos and videos from past battles, competitions and workshops across the scene.
        </p>

        <div className="mt-xl flex flex-wrap gap-sm border-b border-line pb-sm">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`border px-md py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] transition-colors ${
                tab.active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-ink-muted hover:border-accent hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="mt-lg">
          <GalleryGrid items={items} />
        </div>
      </section>
    </main>
  );
}
