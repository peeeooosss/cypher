import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { EventStatus, EventType } from "@/generated/prisma/enums";
import { EVENT_TYPE_LABELS, formatLabel, isWorkshopType } from "@/lib/event-types";

export const dynamic = "force-dynamic";

type EventDetailContext = { params: Promise<{ slug: string }> };

export default async function EventDetailPage({ params }: EventDetailContext) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      organizer: { select: { name: true, studioName: true, studioLogoUrl: true, studioFoundedAt: true } },
      categories: {
        include: { prizePool: true, _count: { select: { registrations: true, matches: true } } },
        orderBy: { name: "asc" },
      },
      scheduleItems: {
        where: { isPublished: true },
        orderBy: { displayOrder: "asc" },
      },
      notices: {
        where: { isArchived: false },
        orderBy: { publishedAt: "desc" },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const isArtist = user?.role === "ARTIST";
  const registrations = isArtist
    ? await prisma.registration.findMany({
        where: {
          categoryId: { in: event.categories.map((c) => c.id) },
          OR: [{ userId: user.id }, { members: { some: { userId: user.id, status: { in: ["PENDING", "ACCEPTED"] } } } }],
        },
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

  function formatPrize(prizePool: { totalAmount: number; currency: string } | null) {
    if (!prizePool || prizePool.totalAmount <= 0) return null;
    return prizePool.currency === "INR"
      ? `₹${prizePool.totalAmount.toLocaleString("en-IN")} prize pool`
      : `${prizePool.currency} ${prizePool.totalAmount.toLocaleString()} prize pool`;
  }

  const totalPrizePool = event.categories.reduce(
    (sum, c) => sum + (c.prizePool?.totalAmount ?? 0),
    0,
  );

  const jumpLinks = [
    { id: "about", label: "About", show: Boolean(event.description) },
    { id: "details", label: "Event Details", show: Boolean(event.eventDetails) },
    { id: "accommodation", label: "Accommodation", show: Boolean(event.accommodationAvailable || event.accommodationDetails) },
    { id: "food", label: "Food", show: Boolean(event.foodAvailable || event.foodDetails) },
    { id: "rules", label: "Rules & Regulations", show: Boolean(event.rulesAndRegulations) },
    { id: "registration", label: "Registration Info", show: Boolean(event.registrationInstructions) },
    { id: "checkin", label: "Check-in", show: Boolean(event.checkInInstructions) },
    { id: "schedule", label: "Schedule", show: event.scheduleItems.length > 0 },
    { id: "notices", label: "Notices", show: event.notices.length > 0 },
    { id: "contact", label: "Contact", show: Boolean(event.contactDetails) },
  ].filter((link) => link.show);

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
            <div className="mt-lg max-w-3xl border border-line bg-line/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.posterUrl} alt={`${event.title} poster`} className="w-full" />
            </div>
          ) : null}
          {event.organizer.studioLogoUrl ? (
            <div className="mt-lg flex items-end gap-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.organizer.studioLogoUrl} alt="Studio logo" className="h-12 w-12 rounded-full border border-line object-cover" />
              <div>
                <p className="font-display text-title-md uppercase">{event.organizer.studioName ?? event.organizer.name ?? "Anonymous"}</p>
                {event.organizer.studioFoundedAt ? (
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
                    Est. {new Date(event.organizer.studioFoundedAt).getFullYear()}
                  </p>
                ) : null}
              </div>
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
            {event.googleMapsUrl && (
              <div>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-muted">Directions</p>
                <a
                  href={event.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-xs inline-flex items-center gap-xs border border-accent bg-accent px-md py-xs font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  Open in Google Maps
                </a>
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
            {jumpLinks.length > 0 && (
              <nav className="mb-section flex flex-wrap gap-sm border border-line bg-paper-soft p-md">
                <span className="mr-xs font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted">
                  Jump to:
                </span>
                {jumpLinks.map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    className="border border-line px-sm py-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-accent transition-colors hover:bg-accent hover:text-paper"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            )}

            {event.description && (
              <section id="about" className="mb-section">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">About</h2>
                <p className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted whitespace-pre-wrap">
                  {event.description}
                </p>
              </section>
            )}

            {/* Event Information Sections */}
            {event.eventDetails && (
              <section id="details" className="mb-section">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Event Details</h2>
                <div className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted whitespace-pre-wrap">
                  {event.eventDetails}
                </div>
              </section>
            )}

            {(event.accommodationAvailable || event.accommodationDetails) && (
              <section id="accommodation" className="mb-section">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Accommodation</h2>
                {event.accommodationDetails && (
                  <div className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted whitespace-pre-wrap">
                    {event.accommodationDetails}
                  </div>
                )}
              </section>
            )}

            {(event.foodAvailable || event.foodDetails) && (
              <section id="food" className="mb-section">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Food & Catering</h2>
                {event.foodDetails && (
                  <div className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted whitespace-pre-wrap">
                    {event.foodDetails}
                  </div>
                )}
              </section>
            )}

            {event.rulesAndRegulations && (
              <section id="rules" className="mb-section">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Rules & Regulations</h2>
                <div className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted whitespace-pre-wrap">
                  {event.rulesAndRegulations}
                </div>
              </section>
            )}

            {event.registrationInstructions && (
              <section id="registration" className="mb-section">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Registration Instructions</h2>
                <div className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted whitespace-pre-wrap">
                  {event.registrationInstructions}
                </div>
              </section>
            )}

            {event.checkInInstructions && (
              <section id="checkin" className="mb-section">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Check-in Instructions</h2>
                <div className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted whitespace-pre-wrap">
                  {event.checkInInstructions}
                </div>
              </section>
            )}

            {/* Schedule */}
            {event.scheduleItems && event.scheduleItems.length > 0 && (
              <section id="schedule" className="mb-section">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Schedule</h2>
                <div className="mt-md space-y-md">
                  {event.scheduleItems.map((item) => (
                    <div key={item.id} className="border border-line bg-paper-soft p-lg">
                      <div className="flex flex-wrap items-start justify-between gap-md">
                        <div>
                          <h3 className="font-display text-title-md uppercase">{item.title}</h3>
                          <p className="mt-xs text-body-sm text-ink-muted">
                            {new Date(item.startTime).toLocaleDateString()} at {new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {item.endTime ? ` – ${new Date(item.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                          </p>
                          {item.description && <p className="mt-xs text-body-sm text-ink-muted">{item.description}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Notices */}
            {event.notices && event.notices.length > 0 && (
              <section id="notices" className="mb-section">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Important Notices</h2>
                <div className="mt-md space-y-md">
                  {event.notices.map((notice) => (
                    <div key={notice.id} className="border border-accent bg-accent/5 p-lg">
                      <h3 className="font-display text-title-md uppercase">{notice.title}</h3>
                      <p className="mt-sm text-body-md leading-relaxed text-ink-muted whitespace-pre-wrap">{notice.message}</p>
                      {notice.link && (
                        <a className="mt-sm inline-flex items-center gap-xs border border-accent bg-accent px-md py-xs font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper" href={notice.link} target="_blank" rel="noopener noreferrer">
                          Open Link
                        </a>
                      )}
                      <p className="mt-xs font-mono text-[0.65rem] uppercase text-ink-muted">Posted: {new Date(notice.publishedAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {event.contactDetails && (
              <section id="contact" className="mb-section">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Contact Information</h2>
                <div className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted whitespace-pre-wrap">
                  {event.contactDetails}
                </div>
              </section>
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
                       <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-accent">{formatLabel(category.format)} · {category.minMembers === category.maxMembers ? category.minMembers : `${category.minMembers}–${category.maxMembers}`} members</p>
                      <p className="mt-sm font-mono text-body-sm uppercase tracking-[0.1em] text-accent">
                        {formatFee(category)}
                      </p>
                      {formatPrize(category.prizePool) && (
                        <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-green-600">
                          {formatPrize(category.prizePool)}
                        </p>
                      )}
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
            {totalPrizePool > 0 && (
              <div>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">Total prize pool</p>
                <p className="mt-xs text-title-md font-bold text-accent">₹{totalPrizePool.toLocaleString("en-IN")}</p>
              </div>
            )}
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
