import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminEventRoster } from "@/components/admin-event-roster";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ eventId: string }> };

export default async function AdminEventRosterPage({ params }: PageProps) {
  await requireAdmin();
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      organizer: { select: { name: true, studioName: true } },
    },
  });

  if (!event) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/admin/events"
        className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
      >
        &larr; Back to events
      </Link>
      <h2 className="mt-sm font-display text-title-md uppercase">{event.title}</h2>
      <p className="mt-xs text-body-sm text-ink-muted">
        {event.status} · {event.organizer.studioName ?? event.organizer.name ?? "—"} · every
        category&apos;s artists with phone numbers. Click a number to copy it.
      </p>
      <div className="mt-lg">
        <AdminEventRoster eventId={event.id} />
      </div>
    </div>
  );
}
