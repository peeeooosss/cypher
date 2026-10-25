import Link from "next/link";
import { EventStatus, UserRole, GigStatus, RegistrationStatus } from "@/generated/prisma/enums";
import { ArtistSlider } from "@/components/artist-slider";
import { HomeEvents } from "@/components/home-events";
import { GallerySlider } from "@/components/gallery-slider";
import { prisma } from "@/lib/prisma";
import { HomeInteractions } from "@/components/home-interactions";
import { HomeHeroStack } from "@/components/home-hero-stack";
import { HomeLightbox } from "@/components/home-lightbox";

export const dynamic = "force-dynamic";

const EVENT_SELECT = {
  id: true,
  title: true,
  slug: true,
  venue: true,
  city: true,
  state: true,
  startsAt: true,
  status: true,
  eventType: true,
  posterUrl: true,
  googleMapsUrl: true,
  showPublicLeaderboard: true,
  categories: { select: { id: true, name: true }, orderBy: { name: "asc" }, take: 4 },
  scheduleItems: {
    where: { isPublished: true },
    select: { id: true, title: true, startTime: true },
    orderBy: { displayOrder: "asc" },
    take: 3,
  },
  notices: {
    where: { isArchived: false },
    select: { id: true, title: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 2,
  },
  _count: { select: { categories: true, scheduleItems: true, notices: true } },
} as const;

export default async function Home() {
  const where = {
    status: { in: [EventStatus.PUBLISHED, EventStatus.LIVE, EventStatus.COMPLETED] },
  };

  const [liveEvents, upcomingEvents, closedEvents, stats, gallerySlides] = await Promise.all([
    prisma.event.findMany({
      where: { ...where, status: EventStatus.LIVE },
      select: EVENT_SELECT,
      orderBy: { startsAt: "asc" },
    }),
    prisma.event.findMany({
      where: { ...where, status: EventStatus.PUBLISHED },
      select: EVENT_SELECT,
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
    prisma.event.findMany({
      where: { ...where, status: EventStatus.COMPLETED },
      select: EVENT_SELECT,
      orderBy: { startsAt: "desc" },
      take: 4,
    }),
    Promise.all([
      prisma.user.count({ where: { role: UserRole.ARTIST, isSuspended: false } }),
      prisma.event.count({ where }),
      prisma.registration.count({ where: { status: { in: [RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING] } } }),
      prisma.gig.count({ where: { status: GigStatus.OPEN } }),
    ]).then(([artists, events, registrations, gigs]) => ({ artists, events, registrations, gigs })),
    prisma.galleryItem.findMany({
      where: { isPublished: true, isFeaturedHomepage: true },
      include: { event: { select: { title: true, slug: true } } },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ]);

  return (
    <main className="min-h-screen bg-paper">
      <HomeInteractions />
      <HomeLightbox />
      {/* Hero */}
      <section id="hero" className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div style={{ position: "absolute", top: "-10rem", left: "50%", transform: "translateX(-50%)", width: "520px", height: "520px", borderRadius: "50%", background: "rgba(255,43,43,0.12)", filter: "blur(160px)" }} />
          <div style={{ position: "absolute", bottom: "-30%", right: "-10%", width: "420px", height: "420px", borderRadius: "50%", background: "rgba(255,43,43,0.08)", filter: "blur(140px)" }} />
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-section md:grid-cols-[1.1fr_0.9fr]">
          <div className="px-md pt-section md:px-xl">
            <div className="perspective-1200">
              <div className="preserve-3d parallax-layer" id="hero-layer" style={{ ["--pz" as string]: "40px" }}>
                <p className="font-mono text-center text-body-sm uppercase tracking-[0.18em] text-accent sm:text-left">
                  The platform for artists, events & organizers
                </p>
                <h1 className="mt-lg font-display text-center text-display-xl uppercase tracking-[-0.03em] leading-tight text-ink sm:text-left md:max-w-2xl">
                  Discover events. Build experiences. Grow your work.
                </h1>
                <p className="mt-md text-center text-body-sm text-ink-muted sm:text-left sm:max-w-2xl">
                  One place to discover competitions, run better events, and connect with
                  the creative community. CYPHR serves artists, organizers, and judges.
                </p>
                <div className="mt-xl flex flex-wrap justify-center gap-sm sm:justify-start">
                  <Link
                    href="/events"
                    className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper transition-opacity hover:opacity-80"
                  >
                    Browse events
                  </Link>
                  <Link
                    href="/artist/directory"
                    className="border border-accent/40 px-lg py-sm text-button-md font-bold uppercase text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    Meet the artists
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <aside className="relative flex items-center border-t border-line bg-paper-soft px-md py-lg md:border-t-0 md:border-l md:px-xl">
            <div className="w-full">
              <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">
                Built for every stage
              </p>
              <ul className="mt-lg space-y-md">
                <li className="border-b border-line pb-sm">
                  <span className="text-accent">01 — </span>Discover events
                </li>
                <li className="border-b border-line pb-sm">
                  <span className="text-accent">02 — </span>Organize & manage
                </li>
                <li className="border-b border-line pb-sm">
                  <span className="text-accent">03 — </span>Get hired & grow
                </li>
              </ul>

              <div className="mt-lg grid grid-cols-2 gap-md">
                <div>
                  <p className="font-display text-title-md text-accent">
                    {stats.artists > 0 ? `${stats.artists}+` : "—"}
                  </p>
                  <p className="mt-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">Artists</p>
                </div>
                <div>
                  <p className="font-display text-title-md text-accent">
                    {stats.registrations > 0 ? `${stats.registrations}+` : "—"}
                  </p>
                  <p className="mt-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">Registrations</p>
                </div>
              </div>
              <div className="mt-xl hidden md:block">
                <HomeHeroStack slides={gallerySlides} />
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Marquee */}
      <section className="grain border-b border-line bg-paper-soft overflow-hidden">
        <div style={{ padding: "1.4rem 0" }}>
          <div className="marquee-track">
            {["UNDERGROUND", "BATTLES", "CYPHER", "CREW", "STAGE", "MOTION", "RHYTHM", "FORM", "PRESSURE", "PRECISION", "HEAT", "LEGACY", "UNDERGROUND", "BATTLES", "CYPHER", "CREW", "STAGE", "MOTION", "RHYTHM", "FORM", "PRESSURE", "PRECISION", "HEAT", "LEGACY"].map((item, idx) => (
              <div key={item + idx} style={{ display: "flex", alignItems: "center", gap: "1.5rem", whiteSpace: "nowrap" }}>
                <span className="font-display" style={{ fontSize: "clamp(1.4rem, 3vw, 2.2rem)", letterSpacing: "0.4em", textTransform: "uppercase" }}>{item}</span>
                <span style={{ height: "1px", width: "3rem", background: "rgba(255,43,43,0.6)", display: "inline-block" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section id="social" className="border-b border-line bg-paper-soft">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-md px-md py-lg md:grid-cols-4 md:px-xl reveal-stagger">
          <div className="flex items-baseline justify-center gap-sm">
            <span className="font-display text-display-lg text-accent">{stats.events > 0 ? stats.events : "—"}</span>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Events hosted</span>
          </div>
          <div className="flex items-baseline justify-center gap-sm">
            <span className="font-display text-display-lg text-accent">{stats.artists > 0 ? stats.artists : "—"}</span>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Artists onboard</span>
          </div>
          <div className="flex items-baseline justify-center gap-sm">
            <span className="font-display text-display-lg text-accent">{stats.registrations > 0 ? stats.registrations : "—"}</span>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Sign-ups</span>
          </div>
          <div className="flex items-baseline justify-center gap-sm">
            <span className="font-display text-display-lg text-accent">{stats.gigs > 0 ? stats.gigs : "—"}</span>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Open gigs</span>
          </div>
        </div>
      </section>

      {/* For organizers / For artists / For opportunities */}
      <section id="built" className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-center text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted md:text-left reveal">
            Built for the whole scene
          </p>
          <div className="mt-lg grid gap-md md:grid-cols-3">
            <Link
              href="/for-organizers"
              className="group flex flex-col justify-between border border-line bg-paper-soft p-xl transition-colors hover:border-accent tilt-hover preserve-3d grain reveal"
            >
              <div>
                <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
                  For organizers
                </p>
                <h2 className="mt-md font-display text-display-lg uppercase">
                  Run better events. Reach the right people.
                </h2>
                <p className="mt-md max-w-prose text-body-sm leading-relaxed text-ink-muted">
                  Create events with full details, manage schedules and categories, communicate
                  with participants, and track analytics in one dashboard.
                </p>
                <ul className="mt-lg space-y-xs text-body-sm text-ink-muted">
                  <li><span className="text-accent">01 — </span>Create events with full details</li>
                  <li><span className="text-accent">02 — </span>Manage registrations & schedules</li>
                  <li><span className="text-accent">03 — </span>Broadcast updates to participants</li>
                </ul>
              </div>
              <span className="mt-lg font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted transition-colors group-hover:text-accent">
                See the step-by-step guide →
              </span>
            </Link>
            <Link
              href="/for-artists"
              className="group flex flex-col justify-between border border-line bg-paper-soft p-xl transition-colors hover:border-accent tilt-hover preserve-3d grain reveal"
              data-delay="80"
            >
              <div>
                <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
                  For artists
                </p>
                <h2 className="mt-md font-display text-display-lg uppercase">
                  Discover opportunities. Build your career.
                </h2>
                <p className="mt-md max-w-prose text-body-sm leading-relaxed text-ink-muted">
                  Find competitions, workshops, and gigs. Register easily, track your
                  history, and grow your professional network.
                </p>
                <ul className="mt-lg space-y-xs text-body-sm text-ink-muted">
                  <li><span className="text-accent">01 — </span>Build your artist profile</li>
                  <li><span className="text-accent">02 — </span>Discover & register for events</li>
                  <li><span className="text-accent">03 — </span>Get hired for gigs & freelance</li>
                </ul>
              </div>
              <span className="mt-lg font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted transition-colors group-hover:text-accent">
                See the step-by-step guide →
              </span>
            </Link>
            <Link
              href="/artist/marketplace"
              className="group flex flex-col justify-between border border-line bg-paper-soft p-xl transition-colors hover:border-accent tilt-hover preserve-3d grain reveal"
              data-delay="160"
            >
              <div>
                <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
                  For opportunities
                </p>
                <h2 className="mt-md font-display text-display-lg uppercase">
                  Post gigs. Hire talent. Get hired.
                </h2>
                <p className="mt-md max-w-prose text-body-sm leading-relaxed text-ink-muted">
                  Post freelance work, browse artist profiles, and connect with the right
                  people for your projects. The marketplace for creative work.
                </p>
                <ul className="mt-lg space-y-xs text-body-sm text-ink-muted">
                  <li><span className="text-accent">01 — </span>Post gigs & freelance work</li>
                  <li><span className="text-accent">02 — </span>Browse & hire verified artists</li>
                  <li><span className="text-accent">03 — </span>Get discovered for paid work</li>
                </ul>
              </div>
              <span className="mt-lg font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted transition-colors group-hover:text-accent">
                Explore marketplace →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Platform demo */}
      <section id="demo" className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <div className="flex flex-wrap items-center justify-between gap-md reveal">
            <div>
              <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
                See it in action
              </p>
              <h2 className="mt-md max-w-2xl font-display text-display-lg uppercase">
                Preview the organizer dashboard & judge portal.
              </h2>
              <p className="mt-sm max-w-2xl text-body-sm text-ink-muted">
                No login needed. Manage events, score performances, and check standings —
                exactly how your team will on event day.
              </p>
            </div>
            <Link
              href="/for-organizers/demo"
              className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper transition-opacity hover:opacity-80"
            >
              Open the demo
            </Link>
          </div>
        </div>
      </section>

      {/* Artist slider */}
      <div id="artists" className="reveal">
        <ArtistSlider />
      </div>

      {/* Events tabs */}
      <div id="events" className="reveal">
        <HomeEvents liveEvents={liveEvents} upcomingEvents={upcomingEvents} closedEvents={closedEvents} />
      </div>

      {/* Gallery slider — past event moments */}
      <div id="gallery" className="reveal">
        <GallerySlider
          items={gallerySlides.map((item) => ({
            id: item.id,
            type: item.type,
            url: item.url,
            thumbnailUrl: item.thumbnailUrl,
            title: item.title,
            eventTitle: item.event?.title ?? null,
            eventSlug: item.event?.slug ?? null,
          }))}
        />
      </div>

      {/* Testimonials */}
      <section id="testimonials" className="border-t border-line bg-paper-soft">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent reveal">
            From the community
          </p>
          <h2 className="mt-md font-display text-display-lg uppercase reveal" data-delay="60">
            Built with the scene, for the scene
          </h2>
          <div className="mt-lg grid gap-md md:grid-cols-3 reveal-stagger">
            {[
              {
                quote:
                  "CYPHR turned our multi-day event into something we could actually run. Registrations, schedules, live scoring — all in one place.",
                name: "Event organizer",
                role: "Multi-category battle series",
              },
              {
                quote:
                  "As an artist, having a professional profile with my battle record and achievements makes a huge difference when organizers reach out.",
                name: "Battle artist",
                role: "Breaking & all-style",
              },
              {
                quote:
                  "Judging went from clipboard chaos to clean, live scoring. Every match, every round, exactly on time.",
                name: "Judge",
                role: "Panel lead",
              },
            ].map((t) => (
              <figure key={t.name} className="flex h-full flex-col justify-between border border-line bg-paper p-lg tilt-hover preserve-3d grain">
                <blockquote className="text-body-sm leading-relaxed text-ink">“{t.quote}”</blockquote>
                <figcaption className="mt-lg">
                  <p className="font-display text-title-sm uppercase">{t.name}</p>
                  <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section id="ctas" className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-md px-md py-section md:grid-cols-2 md:px-xl">
          <Link
            href="/signup"
            className="group border border-accent bg-accent p-xl transition-opacity hover:opacity-90 tilt-hover preserve-3d reveal grain"
          >
            <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-paper/80">For artists</p>
            <h2 className="mt-md font-display text-display-lg uppercase text-paper">
              Claim your profile. Put your work on stage.
            </h2>
            <p className="mt-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-paper/80 transition-colors group-hover:text-paper">
              Join CYPHR →
            </p>
          </Link>
          <Link
            href="/for-organizers"
            className="group border border-line bg-paper-soft p-xl transition-colors hover:border-accent tilt-hover preserve-3d reveal grain"
            data-delay="80"
          >
            <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">For organizers</p>
            <h2 className="mt-md font-display text-display-lg uppercase">
              Ready to run your next event the right way?
            </h2>
            <p className="mt-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted transition-colors group-hover:text-accent">
              See how it works →
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}