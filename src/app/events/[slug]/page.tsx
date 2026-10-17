import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import { EventHero } from "@/components/event-hero";
import { EventSubNav } from "@/components/event-sub-nav";
import { SectionHeading } from "@/components/section-heading";
import { EventJudges } from "@/components/event-judges";
import { EventOrganizer } from "@/components/event-organizer";
import { EventCategories } from "@/components/event-categories";
import { EventSchedule } from "@/components/event-schedule";
import { EventInfoAccordion } from "@/components/event-info-accordion";
import { EventAside } from "@/components/event-aside";
import { EventGalleryStrip } from "@/components/event-gallery-strip";
import { EventOrganizerProfile } from "@/components/event-organizer-profile";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { EventStatus } from "@/generated/prisma/enums";
import { isWorkshopType } from "@/lib/event-types";

export const dynamic = "force-dynamic";

type EventDetailContext = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: EventDetailContext): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { title: true, description: true, posterUrl: true, city: true },
  });
  if (!event) return { title: "Event not found" };
  const description = event.description ?? `Register, compete and follow live scores at ${event.title}.`;
  return {
    title: `${event.title} — CYPHR`,
    description: description.slice(0, 160),
    openGraph: {
      title: event.title,
      description: description.slice(0, 200),
      ...(event.posterUrl ? { images: [{ url: event.posterUrl }] } : {}),
    },
  };
}

export default async function EventDetailPage({ params }: EventDetailContext) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      organizer: { select: { name: true, studioName: true, studioLogoUrl: true, studioFoundedAt: true, bio: true, whatsappNumber: true } },
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
      judges: {
        where: { isPublic: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      },
      galleryItems: {
        where: { isPublished: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        take: 8,
      },
      eventPhotos: {
        where: { isPublic: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!event) {
    notFound();
  }

  const isArtist = user?.role === "ARTIST";
  const isOwner = user?.role === "ORGANIZER" && event.organizerId === user.id;
  const workshop = isWorkshopType(event.eventType);
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
  const isLive = event.status === EventStatus.LIVE;
  const isCompleted = event.status === EventStatus.COMPLETED;

  const isAdmin = user?.role === "ADMIN";
  const canViewBoard = event.showPublicLeaderboard || isOwner || isAdmin;
  const showBoard = (isLive || isCompleted) && !workshop && canViewBoard;
  const boardPaused = (isLive || isCompleted) && !workshop && !canViewBoard;

  const registerHref = isArtist && isOpen ? `/events/${event.slug}/register` : null;
  const registerLabel = workshop ? "Join this workshop" : "Register for this event";
  const liveHref = isLive ? `/events/${event.slug}/live` : null;
  const standingsHref = showBoard ? `/events/${event.slug}/standings` : null;

  let totalPrizePool = event.categories.reduce(
    (sum, c) => sum + (c.prizePool?.totalAmount ?? 0),
    0,
  );
  if (event.slug === "born-to-dance") {
    totalPrizePool = 100000;
  }

  const categories = event.categories.map((category) => ({
    id: category.id,
    name: category.name,
    format: category.format,
    minMembers: category.minMembers,
    maxMembers: category.maxMembers,
    entryFee: category.entryFee,
    entryCurrency: category.entryCurrency,
    maxCompetitors: category.maxCompetitors,
    registeredCount: category._count.registrations,
    prizeTotal: category.prizePool?.totalAmount ?? 0,
    prizeCurrency: category.prizePool?.currency ?? "INR",
  }));

  const judges = event.judges.map((judge) => ({
    id: judge.id,
    name: judge.name,
    title: judge.title,
    bio: judge.bio,
    photoUrl: judge.photoUrl,
    socialLinks: (judge.socialLinks as Record<string, string> | null) ?? null,
  }));

  const infoSections = [
    { id: "rules", label: "Rules & regulations", body: event.rulesAndRegulations },
    { id: "registration", label: "Registration info", body: event.registrationInstructions },
    { id: "checkin", label: "Check-in", body: event.checkInInstructions },
    {
      id: "stay",
      label: "Stay & food",
      body: [event.accommodationDetails, event.foodDetails].filter(Boolean).join("\n\n"),
    },
    { id: "contact", label: "Contact", body: event.contactDetails },
  ];

  const subNav = [
    { id: "about", label: "About", show: Boolean(event.description ?? event.eventDetails) },
    { id: "judges", label: "Judges", show: judges.length > 0 },
    { id: "organizer", label: "Organizer", show: Boolean(event.organizer.bio?.trim()) },
    { id: "categories", label: workshop ? "Sessions" : "Categories", show: true },
    { id: "schedule", label: "Schedule", show: event.scheduleItems.length > 0 },
    { id: "gallery", label: "Gallery", show: event.galleryItems.length > 0 || event.eventPhotos.length > 0 },
    { id: "host", label: "Our host", show: Boolean(event.organizerPhotoUrl || event.organizerBio?.trim()) },
    { id: "notices", label: "Notices", show: event.notices.length > 0 },
    { id: "info", label: "Info", show: infoSections.some((s) => s.body && s.body.trim()) },
    { id: "results", label: "Results", show: showBoard || boardPaused },
  ].filter((link) => link.show);

  const galleryStripItems = [
    ...event.eventPhotos.map((photo) => ({
      id: photo.id,
      type: "PHOTO" as const,
      url: photo.photoUrl,
      thumbnailUrl: null as string | null,
      title: photo.caption,
    })),
    ...event.galleryItems.map((item) => ({
      id: item.id,
      type: item.type,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      title: item.title,
    })),
  ];

  return (
    <main className="min-h-screen bg-paper pb-24 md:pb-0">
      <EventHero
        event={{
          title: event.title,
          description: event.description,
          status: event.status,
          eventType: event.eventType,
          city: event.city,
          state: event.state,
          venue: event.venue,
          googleMapsUrl: event.googleMapsUrl,
          posterUrl: event.posterUrl,
          slug: event.slug,
          startsAt: event.startsAt,
          organizerName: event.organizer.name,
          studioName: event.organizer.studioName,
          studioLogoUrl: event.organizer.studioLogoUrl,
          studioSince: event.organizer.studioFoundedAt
            ? String(new Date(event.organizer.studioFoundedAt).getFullYear())
            : null,
          registerHref,
          registerLabel,
          resultsHref: standingsHref,
          resultsLabel: isCompleted ? "View results" : isLive ? "Live standings" : null,
          liveHref,
        }}
      />

      <EventSubNav links={subNav} />

      <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
        <div className="grid gap-xl lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-section">
            {(event.description ?? event.eventDetails) ? (
              <section id="about" aria-label="About" className="scroll-mt-24">
                <SectionHeading eyebrow="The event" title="About" />
                <p className="max-w-prose whitespace-pre-wrap text-body-lg leading-relaxed text-ink-muted">
                  {event.description ?? event.eventDetails}
                </p>
                <div className="mt-lg grid grid-cols-3 gap-md">
                  <div className="rounded-lg border border-line bg-paper-soft p-md text-center">
                    <p className="font-display text-display-md tabular-nums text-accent">
                      {event.categories.length}
                    </p>
                    <p className="mt-xs font-mono text-[0.6rem] uppercase tracking-[0.15em] text-ink-muted">
                      {workshop ? "Sessions" : "Categories"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-line bg-paper-soft p-md text-center">
                    <p className="font-display text-display-md tabular-nums text-accent">
                      {event.judges.length}
                    </p>
                    <p className="mt-xs font-mono text-[0.6rem] uppercase tracking-[0.15em] text-ink-muted">
                      Judges
                    </p>
                  </div>
                  <div className="rounded-lg border border-line bg-paper-soft p-md text-center">
                    <p className="font-display text-display-md tabular-nums text-accent">
                      {totalPrizePool > 0 ? `₹${Math.round(totalPrizePool / 1000)}K` : "—"}
                    </p>
                    <p className="mt-xs font-mono text-[0.6rem] uppercase tracking-[0.15em] text-ink-muted">
                      Prize pool
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            <EventJudges judges={judges} />

            <EventOrganizer
              organizer={{
                name: event.organizer.name,
                studioName: event.organizer.studioName,
                studioLogoUrl: event.organizer.studioLogoUrl,
                studioSince: event.organizer.studioFoundedAt
                  ? String(new Date(event.organizer.studioFoundedAt).getFullYear())
                  : null,
                bio: event.organizer.bio,
              }}
            />

            <EventCategories
              categories={categories}
              isWorkshop={workshop}
              registerHref={registerHref}
              totalPrize={totalPrizePool}
              slug={event.slug}
            />

            <EventSchedule items={event.scheduleItems} />

            <EventGalleryStrip items={galleryStripItems} />

            <EventOrganizerProfile
              organizer={{
                name: event.organizer.name,
                studioName: event.organizer.studioName,
                photoUrl: event.organizerPhotoUrl,
                bio: event.organizerBio,
              }}
            />

            {event.notices.length > 0 ? (
              <section id="notices" aria-label="Notices" className="scroll-mt-24">
                <SectionHeading eyebrow="Heads up" title="Notices" />
                <div className="space-y-md">
                  {event.notices.map((notice) => (
                    <article key={notice.id} className="rounded-lg border border-accent/50 bg-accent/5 p-lg">
                      <h3 className="font-display text-title-md uppercase">{notice.title}</h3>
                      <p className="mt-sm whitespace-pre-wrap text-body-md leading-relaxed text-ink-muted">
                        {notice.message}
                      </p>
                      {notice.link ? (
                        <a
                          href={notice.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-sm inline-block border border-accent bg-accent px-md py-xs font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper"
                        >
                          Open link
                        </a>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <EventInfoAccordion sections={infoSections} />

            {showBoard ? (
              <div id="results" className="scroll-mt-24 border-t border-line pt-section">
                <LiveLeaderboard
                  eventId={event.id}
                  title={`${event.title} — ${isLive ? "Live standings" : "Final standings"}`}
                  live={isLive}
                />
              </div>
            ) : null}
            {boardPaused ? (
              <div id="results" className="scroll-mt-24 rounded-lg border border-line bg-paper-soft p-lg text-center">
                <p className="font-display text-title-md uppercase">Results paused</p>
                <p className="mt-sm text-body-sm text-ink-muted">
                  The organizer has hidden public results for now. Registered artists can still see
                  their own scores on their dashboard.
                </p>
              </div>
            ) : null}
          </div>

          <EventAside
            event={{
              status: event.status,
              slug: event.slug,
              startsAt: event.startsAt,
              venue: event.venue,
              city: event.city,
              registrationDeadline: event.lastRegistrationAt,
              categoryCount: event.categories.length,
              totalPrize: event.slug === "born-to-dance" ? 100000 : totalPrizePool,
              registeredText:
                registeredCategoryIds.size > 0
                  ? `You're in${paidCategoryIds.size > 0 ? " (paid)" : ""} — ${registeredCategoryIds.size} ${registeredCategoryIds.size === 1 ? "category" : "categories"}`
                  : null,
              registerHref,
              registerLabel,
              standingsHref,
              liveHref,
            }}
          />
        </div>
      </div>

      {!isArtist && isOpen ? (
        <div className="mx-auto max-w-7xl px-md pb-section md:px-xl">
          <div className="rounded-lg border border-line bg-paper-soft p-lg text-center">
            <p className="text-body-md text-ink-muted">
              Competing at {event.title}? Sign in as an artist to register.
            </p>
            <Link
              href="/login"
              className="mt-md inline-block rounded-md border border-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent transition-colors hover:bg-accent hover:text-paper"
            >
              Sign in as artist
            </Link>
          </div>
        </div>
      ) : null}

      {/* Mobile sticky action bar */}
      {(registerHref || standingsHref || liveHref) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur md:hidden">
          <div className="flex gap-sm px-md py-sm" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
            {liveHref ? (
              <Link
                href={liveHref}
                className="flex h-12 flex-1 items-center justify-center gap-xs rounded-md border border-accent bg-accent/10 font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-accent"
              >
                <span className="h-2 w-2 animate-pulse-soft rounded-full bg-current" />
                Live
              </Link>
            ) : null}
            {standingsHref ? (
              <Link
                href={standingsHref}
                className="flex h-12 flex-1 items-center justify-center rounded-md border border-line-strong font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink"
              >
                Results
              </Link>
            ) : null}
            {registerHref ? (
              <Link
                href={registerHref}
                className="flex h-12 flex-[2] items-center justify-center rounded-md bg-accent font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-paper"
              >
                {registerLabel}
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
