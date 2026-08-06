export const metadata = {
  title: "About Us | CYPHR — Underground Artist Platform",
  description:
    "CYPHR exists to put Northeast Indian artists on the map — taking wild, multitalented performers from underground to India and the world.",
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
    title: "Battles & cyphers",
    text: "Real stages, real rounds, real crowds. A proper bracket system from cypher to finals.",
  },
  {
    number: "02",
    title: "Live scoring",
    text: "Judges score in real time. Standings update live so every battle is transparent.",
  },
  {
    number: "03",
    title: "One platform",
    text: "Registration, payment, judging, results, prizes, and the marketplace — everything in one place.",
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
            One platform for everything.
          </h1>
          <p className="mt-md max-w-2xl text-body-md text-ink-muted">
            CYPHR is an underground artist platform built to take Northeast Indian
            artists to India and the world.
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
              Crazy talent. No stage.
            </h2>
            <p className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted">
              The Northeast is bursting with culture — and some of the most
              multitalented artists you will ever see. Yet they stay underrated.
              They cannot find gigs, there is no single stage that sees them, and
              their sound never leaves the region.
            </p>
          </div>
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
              The mission
            </p>
            <h2 className="mt-md font-display text-display-lg uppercase">
              Northeast to the world.
            </h2>
            <p className="mt-md max-w-prose text-body-md leading-relaxed text-ink-muted">
              We want to promote Northeast artists to all of India and the global
              level. When you get your dues, your culture moves with you — and the
              world gets to feel how wild this scene really is.
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

      <section className="mx-auto max-w-7xl px-md py-section text-center md:px-xl">
        <h2 className="font-display text-display-lg uppercase">
          We can do this.
        </h2>
        <p className="mx-auto mt-md max-w-xl text-body-md text-ink-muted">
          If you are an artist, an organizer, a judge, or someone who just loves
          the floor — your platform is here.
        </p>
        <div className="mt-xl flex flex-wrap justify-center gap-sm">
          <Link
            href="/events"
            className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper transition-opacity hover:opacity-80"
          >
            Browse events
          </Link>
          <Link
            href="/signup"
            className="border border-line px-lg py-sm text-button-md font-bold uppercase text-ink transition-colors hover:border-accent"
          >
            Join the floor
          </Link>
        </div>
      </section>
    </main>
  );
}
