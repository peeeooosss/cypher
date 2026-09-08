export const metadata = {
  title: "For Artists | CYPHR — Discover events, build your career",
  description:
    "Find competitions, workshops, and gigs. Register easily, track your history, and grow your professional network on one platform.",
};

import Link from "next/link";
import { ArtistSlider } from "@/components/artist-slider";
import { StepGuide } from "@/components/step-guide";
import { artistGuideTabs } from "@/lib/guide-content";

const features = [
  {
    number: "01",
    title: "Discover events & opportunities",
    text: "Find competitions, workshops, and gigs in one place. New opportunities appear the moment organizers publish them.",
  },
  {
    number: "02",
    title: "Simple registration",
    text: "Pick your category, pay your entry, and you're confirmed. Clear event details, schedules, and rules before you commit.",
  },
  {
    number: "03",
    title: "Live results & feedback",
    text: "Get scored by judges and watch your results update in real time. Every evaluation is transparent.",
  },
  {
    number: "04",
    title: "Your event history",
    text: "Every event you enter stays on your profile. Your placements, scores, and achievements — your record follows you.",
  },
  {
    number: "05",
    title: "Professional network",
    text: "Connect with artists, organizers, and judges. Collaborate, get referred, and stay plugged into the community.",
  },
  {
    number: "06",
    title: "Gigs & freelance work",
    text: "Turn your skills into income. Get hired for performances, workshops, and freelance projects from organizers.",
  },
];

const steps = [
  { number: "01", title: "Create your profile", text: "Showcase your skills, style, and experience." },
  { number: "02", title: "Find your event", text: "Browse competitions, workshops, and gigs." },
  { number: "03", title: "Register & confirm", text: "Join categories online and confirm your spot." },
  { number: "04", title: "Perform & grow", text: "Get results, build your record, and land opportunities." },
];

export default function ForArtistsPage() {
  return (
    <main className="min-h-screen bg-paper">
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
            For artists
          </p>
          <h1 className="mt-lg max-w-4xl font-display text-display-xl uppercase leading-tight tracking-[-0.03em]">
            Discover opportunities. Build your career.
          </h1>
          <p className="mt-md max-w-2xl text-body-md text-ink-muted">
            Find competitions, workshops, and gigs. Register easily, track your
            history, and grow your professional network on one platform.
          </p>
          <div className="mt-xl flex flex-wrap gap-sm">
            <Link
              href="/signup"
              className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper transition-opacity hover:opacity-80"
            >
              Create your artist profile
            </Link>
            <Link
              href="/events"
              className="border border-line px-lg py-sm text-button-md font-bold uppercase text-ink transition-colors hover:border-accent"
            >
              Discover events
            </Link>
          </div>
        </div>
      </section>

      <ArtistSlider />

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
            What you get
          </p>
          <h2 className="mt-md max-w-4xl font-display text-display-lg uppercase">
            Everything to take your career forward.
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
            Get started, step by step.
          </h2>
          <p className="mt-sm max-w-3xl text-body-sm leading-relaxed text-ink-muted">
            From signing up to registering for events and landing gigs. Pick a topic to
            follow along.
          </p>
          <StepGuide tabs={artistGuideTabs} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-md py-section text-center md:px-xl">
        <h2 className="font-display text-display-lg uppercase">
          Ready to grow your career?
        </h2>
        <p className="mx-auto mt-md max-w-4xl text-body-md text-ink-muted">
          Dancers, musicians, DJs, performers — your profile is your
          portfolio. Build it now and let opportunities find you.
        </p>
        <div className="mt-xl flex flex-wrap justify-center gap-sm">
          <Link
            href="/signup"
            className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper transition-opacity hover:opacity-80"
          >
            Create your artist profile
          </Link>
          <Link
            href="/for-organizers"
            className="border border-line px-lg py-sm text-button-md font-bold uppercase text-ink transition-colors hover:border-accent"
          >
            For organizers
          </Link>
        </div>
      </section>
    </main>
  );
}
