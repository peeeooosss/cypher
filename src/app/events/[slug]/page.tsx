import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { EventStatus, EventType } from "@/generated/prisma/enums";
import { EVENT_TYPE_LABELS, isWorkshopType } from "@/lib/event-types";

export const dynamic = "force-dynamic";

type EventDetailContext = { params: Promise<{ slug: string }> };

export default async function EventDetailPage({ params }: EventDetailContext) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      organizer: { select: { name: true } },
      categories: {
        include: { _count: { select: { registrations: true, matches: true } } },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const isArtist = user?.role === "ARTIST";
  const registrations = isArtist
    ? await prisma.registration.findMany({
        where: { userId: user.id, categoryId: { in: event.categories.map((c) => c.id) } },
        select: { categoryId: true, paid: true },
      })
    : [];
  const registeredCategoryIds = new Set(registrations.map((r) => r.categoryId));
  const paidCategoryIds = new Set(registrations.filter((r) => r.paid).map((r) => r.categoryId));

  const isOpen = event.status !== EventStatus.COMPLETED && event.status !== EventStatus.CANCELLED;

  function formatFee(category: { entryFee: number | null; entryCurrency: string }) {
    if (!category.entryFee || category.entryFee <= 0) return "Free entry";
    return category.entryCurrency === "INR"
      ? `₹${category.entryFee} entry`
      : `${category.entryCurrency} ${category.entryFee} entry`;
  }

  return (
    <main className="min-h-screen bg-paper">
      <div className="border-b border-line bg-paper-soft">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <div className="flex flex-wrap items-center gap-md">
            <StatusBadge status={event.status} />
            {event.eventType && (
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-accent">
                {EVENT_TYPE_LABELS[event.eventType as EventType] ?? event.eventType}
              </span>
            )}
            {event.city && (
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
                {event.city}
              </span>
            )}
            {event.state && (
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
                {event.state}
              </span>
            )}
          </div>
          <h1 className="mt-lg max-w-4xl font-display text-display-xl uppercase">{event.title}</h1>
          {event.posterUrl ? (
            <div className="mt-lg max-w-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.posterUrl} alt={`${event.title} poster`} className="w-full border border-line" />
            </div>
          ) : null}
          <div className="mt-lg flex flex-wrap gap-lg text-body-sm text-ink-muted">
            <div>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-muted">Date</p>
              <p className="mt-xs">{formatDate(event.startsAt)}</p>
            </div>
            {event.venue && (
              <div>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-muted">Venue</p>
                <p className="mt-xs">{event.venue}</p>
              </div>
            )}
            <div>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-muted">Organizer</p>
              <p className="mt-xs">{event.organizer.name ?? "Anonymous"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
        <div className="grid gap-xl lg:grid-cols-[1fr_0.42fr]">
          <section>
            {event.description && (
              <>
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">About</h2>
                <p className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted whitespace-pre-wrap">
                  {event.description}
                </p>
              </>
            )}

            <div className={event.description ? "mt-section" : ""}>
              <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
                {isWorkshopType(event.eventType)
                  ? `Sessions (${event.categories.length})`
                  : `Categories (${event.categories.length})`}
              </h2>
              {event.categories.length === 0 ? (
                <p className="mt-md border border-line p-lg text-body-sm text-ink-muted">
                  No categories added yet.
                </p>
              ) : (
                <div className="mt-md grid gap-md sm:grid-cols-2">
                  {event.categories.map((category) => (
                    <div
                      key={category.id}
                      className="border border-line bg-paper-soft p-lg"
                    >
                      <h3 className="font-display text-title-md uppercase">{category.name}</h3>
                      <p className="mt-sm font-mono text-body-sm uppercase tracking-[0.1em] text-accent">
                        {formatFee(category)}
                      </p>
                      <div className="mt-sm flex flex-wrap gap-md text-body-sm text-ink-muted">
                        <span>{category._count.registrations} registered</span>
                        {category.maxCompetitors && (
                          <span>Max {category.maxCompetitors}</span>
                        )}
                        {category._count.matches > 0 && (
                          <span>{category._count.matches} matches</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-lg border-t border-line pt-lg lg:border-l lg:border-t-0 lg:pl-xl lg:pt-0">
            <div>
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Status</p>
              <StatusBadge status={event.status} />
            </div>
            <div>
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Slug</p>
              <p className="mt-xs font-mono text-body-sm text-ink-muted">{event.slug}</p>
            </div>
            <div>
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Total categories</p>
              <p className="mt-xs text-body-md text-ink">{event.categories.length}</p>
            </div>
            {isArtist && isOpen && (
              <Link
                href={`/events/${event.slug}/register`}
                className="mt-lg block border border-accent bg-accent px-md py-sm text-center font-mono text-[0.7rem] uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
              >
                {isWorkshopType(event.eventType) ? "Join this workshop" : "Register for this event"}
              </Link>
            )}
            {isArtist && registeredCategoryIds.size > 0 && (
              <p className="mt-sm text-body-sm text-ink-muted">
                {isWorkshopType(event.eventType)
                  ? `You are joining ${registeredCategoryIds.size} ${registeredCategoryIds.size === 1 ? "session" : "sessions"}`
                  : `You are registered in ${registeredCategoryIds.size} `}
                {[...paidCategoryIds].length > 0 ? " (paid)" : ""}.
              </p>
            )}
            {!isArtist && isOpen && (
              <Link
                href="/login"
                className="mt-lg block border border-accent px-md py-sm text-center font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent hover:bg-accent hover:text-paper"
              >
                Sign in as artist to register
              </Link>
            )}
          </aside>
        </div>

        {event.status === EventStatus.LIVE && !isWorkshopType(event.eventType) && (
          <div className="mt-section border-t border-line pt-section">
            <LiveLeaderboard eventId={event.id} title={`${event.title} — Live standings`} />
          </div>
        )}
      </div>
    </main>
  );
}
