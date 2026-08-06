export const metadata = {
  title: "For Organizers | CYPHR — Run your event, hire top artists",
  description:
    "Create events, market them to the artist community, take online payments, and hire thousands of dancers, DJs, musicians, and performers.",
};

import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Hire top artists",
    text: "Browse thousands of dancers, DJs, guitarists, drummers, and performers. Filter by style, city, and experience — find the exact talent your competition or stage needs.",
  },
  {
    number: "02",
    title: "Market your event",
    text: "Publish your event and it reaches the artist community instantly. Artists discover your competition, register for categories, and fill your floor — no flyers needed.",
  },
  {
    number: "03",
    title: "Run your bracket",
    text: "Set categories and entry fees, seed your artists, and run rounds from cypher to finals. The whole bracket lives in your dashboard.",
  },
  {
    number: "04",
    title: "Take payments",
    text: "Artists pay their entry online through UPI, tap \"I have paid\", and send you the proof. You approve each payment and confirm the artist in one click.",
  },
  {
    number: "05",
    title: "Live scoring & judging",
    text: "Generate judge codes and let judges score battles in real time. Standings update live so every round is transparent.",
  },
  {
    number: "06",
    title: "Prizes & leaderboards",
    text: "Set prize pools, track results, and crown your winners. The leaderboard stays live long after the last battle.",
  },
];

const steps = [
  { number: "01", title: "Create your event", text: "Name it, add categories and entry fees, publish." },
  { number: "02", title: "Artists register & pay", text: "The community sees your event and joins online." },
  { number: "03", title: "Run it live", text: "Seed the bracket, assign judges, score every round." },
  { number: "04", title: "Approve & pay out", text: "Confirm entries, crown winners, release prizes." },
];

export default function ForOrganizersPage() {
  return (
    <main className="min-h-screen bg-paper">
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
            For organizers
          </p>
          <h1 className="mt-lg max-w-4xl font-display text-display-xl uppercase leading-tight tracking-[-0.03em]">
            Build your battle.
          </h1>
          <p className="mt-md max-w-2xl text-body-md text-ink-muted">
            Create your competition, put it in front of thousands of artists, run it
            live, and walk away with a stage everyone remembers.
          </p>
          <div className="mt-xl flex flex-wrap gap-sm">
            <Link
              href="/signup"
              className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper transition-opacity hover:opacity-80"
            >
              Create your event
            </Link>
            <Link
              href="/events"
              className="border border-line px-lg py-sm text-button-md font-bold uppercase text-ink transition-colors hover:border-accent"
            >
              See live events
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
            What you get
          </p>
          <h2 className="mt-md max-w-4xl font-display text-display-lg uppercase">
            Everything you need to run the floor.
          </h2>
          <div className="mt-lg grid gap-md md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.number} className="border border-line bg-paper-soft p-lg">
                <span className="font-mono text-body-sm text-accent">{feature.number} —</span>
                <h3 className="mt-sm font-display text-title-md uppercase">{feature.title}</h3>
                <p className="mt-sm text-body-sm leading-relaxed text-ink-muted">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
            How it works
          </p>
          <div className="mt-lg grid gap-md md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.number} className="border border-line bg-paper-soft p-lg">
                <span className="font-mono text-body-sm text-accent">{step.number} —</span>
                <h3 className="mt-sm font-display text-title-md uppercase">{step.title}</h3>
                <p className="mt-sm text-body-sm leading-relaxed text-ink-muted">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-md py-section text-center md:px-xl">
        <h2 className="font-display text-display-lg uppercase">
          Your stage. Your rules.
        </h2>
        <p className="mx-auto mt-md max-w-4xl text-body-md text-ink-muted">
          Organizers, collectives, and organizations — hire the talent you need and
          run events that artists actually line up for.
        </p>
        <div className="mt-xl flex flex-wrap justify-center gap-sm">
          <Link
            href="/signup"
            className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper transition-opacity hover:opacity-80"
          >
            Sign up as organizer
          </Link>
          <Link
            href="/for-artists"
            className="border border-line px-lg py-sm text-button-md font-bold uppercase text-ink transition-colors hover:border-accent"
          >
            For artists
          </Link>
        </div>
      </section>
    </main>
  );
}
