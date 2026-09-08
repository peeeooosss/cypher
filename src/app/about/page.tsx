export const metadata = {
  title: "About Us | CYPHR — Platform for Artists, Events & Organizers",
  description:
    "CYPHR is the platform for artists, organizers, and judges to discover events, run competitions, and grow creative careers.",
};

import Link from "next/link";

const disciplines = [
  "Dancers",
  "Choreographers",
  "DJs",
  "Guitarists",
  "Drummers",
  "Performers",
];

const pillars = [
  {
    number: "01",
    title: "Discover & register",
    text: "Find competitions, workshops, and gigs. Register in minutes with clear event details.",
  },
  {
    number: "02",
    title: "Run events professionally",
    text: "Organizers manage schedules, categories, communications, and analytics in one dashboard.",
  },
  {
    number: "03",
    title: "Transparent judging",
    text: "Standardized scoring tools, live results, and clear criteria for fair evaluations.",
  },
];

const roles = [
  {
    tag: "Discover",
    title: "For artists",
    text: "Find competitions, workshops, and gigs. Register easily, track your history, and build your professional profile.",
  },
  {
    tag: "Organize",
    title: "For organizers",
    text: "Create events with full details, manage schedules and categories, broadcast updates, and track analytics.",
  },
  {
    tag: "Hire",
    title: "For organizations",
    text: "Post gigs and freelance work. Browse artist profiles, review applications, and hire the talent you need.",
  },
  {
    tag: "Judge",
    title: "For judges",
    text: "Score performances with standardized tools. Transparent criteria, live results, and feedback for every participant.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-paper">
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
            About us
          </p>
          <h1 className="mt-lg max-w-4xl font-display text-display-xl uppercase leading-tight tracking-[-0.03em]">
            One platform for every role.
          </h1>
          <p className="mt-md max-w-2xl text-body-md text-ink-muted">
            CYPHR connects artists, organizers, and judges in one place.
            Discover events, run competitions, and build your creative career.
          </p>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-section px-md py-section md:grid-cols-2 md:px-xl">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
              The problem
            </p>
            <h2 className="mt-md font-display text-display-lg uppercase">
              Talent scattered. No central stage.
            </h2>
            <p className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted">
              Artists struggle to find opportunities. Organizers can&apos;t reach the right
              participants. Judges have no standard tools. Everyone operates in silos.
            </p>
          </div>
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
              The mission
            </p>
            <h2 className="mt-md font-display text-display-lg uppercase">
              Connect the creative ecosystem.
            </h2>
            <p className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted">
              We want to bring artists, organizers, and judges onto one platform.
              When opportunities are visible and events are well-run, the whole
              community grows.
            </p>
            <div className="mt-lg flex flex-wrap gap-sm">
              {disciplines.map((d) => (
                <span
                  key={d}
                  className="border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
            Who we serve
          </p>
          <div className="mt-lg grid gap-md md:grid-cols-3">
            <div className="border border-line bg-paper-soft p-lg">
              <span className="font-mono text-body-sm text-accent">01 —</span>
              <h3 className="mt-sm font-display text-title-md uppercase">Artists</h3>
              <p className="mt-sm text-body-sm leading-relaxed text-ink-muted">
                Dancers, musicians, DJs, performers — discover events, register, and get hired.
              </p>
            </div>
            <div className="border border-line bg-paper-soft p-lg">
              <span className="font-mono text-body-sm text-accent">02 —</span>
              <h3 className="mt-sm font-display text-title-md uppercase">Organizers</h3>
              <p className="mt-sm text-body-sm leading-relaxed text-ink-muted">
                Create events, manage schedules, communicate with participants, track analytics.
              </p>
            </div>
            <div className="border border-line bg-paper-soft p-lg">
              <span className="font-mono text-body-sm text-accent">03 —</span>
              <h3 className="mt-sm font-display text-title-md uppercase">Judges</h3>
              <p className="mt-sm text-body-sm leading-relaxed text-ink-muted">
                Score performances with standardized tools, transparent criteria, live results.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
            How we do it
          </p>
          <div className="mt-lg grid gap-md md:grid-cols-3">
            {pillars.map((pillar) => (
              <div key={pillar.number} className="border border-line bg-paper-soft p-lg">
                <span className="font-mono text-body-sm text-accent">
                  {pillar.number} —
                </span>
                <h3 className="mt-sm font-display text-title-md uppercase">
                  {pillar.title}
                </h3>
                <p className="mt-sm text-body-sm leading-relaxed text-ink-muted">
                  {pillar.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
            Everything you need
          </p>
          <h2 className="mt-md max-w-4xl font-display text-display-lg uppercase">
            One platform for every role.
          </h2>
          <div className="mt-lg grid gap-md md:grid-cols-2">
            {roles.map((role) => (
              <div key={role.tag} className="border border-line bg-paper-soft p-lg">
                <span className="font-mono text-body-sm text-accent">{role.tag}</span>
                <h3 className="mt-sm font-display text-title-md uppercase">{role.title}</h3>
                <p className="mt-sm max-w-prose text-body-sm leading-relaxed text-ink-muted">
                  {role.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-md py-section text-center md:px-xl">
        <h2 className="font-display text-display-lg uppercase">
          We can do this.
        </h2>
        <p className="mx-auto mt-md max-w-4xl text-body-md text-ink-muted">
          Whether you create, perform, organize, or evaluate — your platform is here.
        </p>
        <div className="mt-xl flex flex-wrap justify-center gap-sm">
          <Link
            href="/events"
            className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper transition-opacity hover:opacity-80"
          >
            Discover events
          </Link>
          <Link
            href="/signup"
            className="border border-line px-lg py-sm text-button-md font-bold uppercase text-ink transition-colors hover:border-accent"
          >
            Get started
          </Link>
        </div>
      </section>
    </main>
  );
}
