import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { EventDashboard } from "@/components/event-dashboard";
import { EventDeleteButton } from "@/components/event-delete-button";
import { EventStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function OrganizerEventPage({ params }: PageProps) {
  const { eventId } = await params;
  const user = await requireRole("ORGANIZER");

  const event = await prisma.event.findUnique({
    where: { id: eventId, organizerId: user.id },
    include: {
      categories: {
        include: {
          rounds: { orderBy: { order: "asc" } },
          judgeSlots: { select: { id: true, code: true, name: true, isActive: true } },
          prizePool: true,
           _count: { select: { registrations: true, registrationMembers: true } },
        },
        orderBy: { name: "asc" },
      },
      judgeSlots: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <Link
        href="/organizer"
        className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
      >
        &larr; Back to events
      </Link>
      <div className="mt-lg">
        <div>
          <h1 className="font-display text-display-lg uppercase">
            {event.title}
          </h1>
          <p className="mt-sm text-body-sm text-ink-muted">
            {event.startsAt.toLocaleString()} / {event.status} / {event.slug}
          </p>
        </div>
        {event.status === EventStatus.DRAFT ? (
          <div className="mt-md border-t border-line pt-md">
            <EventDeleteButton eventId={event.id} />
          </div>
        ) : null}
      </div>

      <EventDashboard key={event.id} event={event} />
    </main>
  );
}
