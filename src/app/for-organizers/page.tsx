export const metadata = {
  title: "For Organizers | CYPHR — Run better events, reach the right people",
  description:
    "Create events with full details, manage schedules and categories, communicate with participants, and track analytics in one dashboard.",
};

import Link from "next/link";
import { StepGuide } from "@/components/step-guide";
import { organizerGuideTabs } from "@/lib/guide-content";

const features = [
  {
    number: "01",
    title: "Hire the right talent",
    text: "Browse thousands of dancers, DJs, musicians, and performers. Filter by style, city, and experience — find the exact talent your event needs.",
  },
  {
    number: "02",
    title: "Reach your audience",
    text: "Publish your event and it reaches the artist community instantly. Participants discover your event, register, and fill your venue.",
  },
  {
    number: "03",
    title: "Manage everything in one place",
    text: "Create events with full details, set categories and schedules, manage registrations, and track everything in your dashboard.",
  },
  {
    number: "04",
    title: "Communicate with participants",
    text: "Broadcast updates, schedule changes, and important notices to all registered artists with one click. Email and in-app delivery.",
  },
  {
    number: "05",
    title: "Professional judging tools",
    text: "Generate judge codes, run standardized scoring, and get transparent results. Works for battles, competitions, and showcases.",
  },
  {
    number: "06",
    title: "Analytics & reports",
    text: "Track registrations, revenue, and performance. Download XLSX reports for completed events. Know what works.",
  },
];

const steps = [
  { number: "01", title: "Create your event", text: "Add details, schedule, categories, and entry fees." },
  { number: "02", title: "Participants register", text: "The community sees your event and joins online." },
  { number: "03", title: "Run it live", text: "Manage schedule, communicate updates, run judging." },
  { number: "04", title: "Analyze & grow", text: "Review results, download reports, plan the next one." },
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
            Run better events. Reach the right people.
          </h1>
          <p className="mt-md max-w-2xl text-body-md text-ink-muted">
            Create events with full details, manage schedules and categories, communicate
            with participants, and track analytics in one dashboard.
          </p>
          <div className="mt-xl flex flex-wrap gap-sm">
            <Link
              href="/signup"
              className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper transition-opacity hover:opacity-80"
            >
              Create your event
            </Link>
            <Link
              href="/for-organizers/demo"
              className="border border-line px-lg py-sm text-button-md font-bold uppercase text-ink transition-colors hover:border-accent"
            >
              Try the demo
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
            Everything you need to run professional events.
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

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
            How to use
          </p>
          <h2 className="mt-md max-w-4xl font-display text-display-lg uppercase">
            Run your event, step by step.
          </h2>
          <p className="mt-sm max-w-3xl text-body-sm leading-relaxed text-ink-muted">
            Everything from signing up to managing the dashboard and analyzing results. Pick a topic to
            follow along.
          </p>
          <StepGuide tabs={organizerGuideTabs} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-md py-section text-center md:px-xl">
        <h2 className="font-display text-display-lg uppercase">
          Your events. Professional results.
        </h2>
        <p className="mx-auto mt-md max-w-4xl text-body-md text-ink-muted">
          Organizers, collectives, and organizations — create events that run smoothly,
          reach the right people, and grow your community.
        </p>
        <div className="mt-xl flex flex-wrap justify-center gap-sm">
          <Link
            href="/signup"
            className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper transition-opacity hover:opacity-80"
          >
            Create your event
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
