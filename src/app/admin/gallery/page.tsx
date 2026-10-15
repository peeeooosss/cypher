import { GalleryManager } from "@/components/gallery-manager";

export const dynamic = "force-dynamic";

export default function AdminGalleryPage() {
  return (
    <div>
      <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Gallery</p>
      <h2 className="mt-sm font-display text-display-md uppercase">Past event moments</h2>
      <p className="mt-sm max-w-2xl text-body-sm text-ink-muted">
        Upload photos and add videos. Featured items appear in the homepage slider; everything
        published appears on the public gallery page.
      </p>
      <div className="mt-lg">
        <GalleryManager />
      </div>
    </div>
  );
}
