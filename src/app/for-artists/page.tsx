export const metadata = {
  title: "For Artists | CYPHR — Compete, rank, network, get gigs",
  description:
    "Find competitions, register in minutes, get scored live, track your history, network with the community, and land paid gigs and freelance work.",
};

import Link from "next/link";
import { ArtistSlider } from "@/components/artist-slider";

const features = [
  {
    number: "01",
    title: "Event & competition updates",
    text: "Never miss the next cypher or battle. New events and competition updates land straight on the platform the moment they go live.",
  },
  {
    number: "02",
    title: "Easy registration",
    text: "Pick your category, pay your entry online through UPI, and you are in. No forms, no queues — register in minutes.",
  },
  {
    number: "03",
    title: "Live leaderboard",
    text: "Get scored live by judges and watch your rank move in real time. Every battle is transparent and every point counts.",
  },
  {
    number: "04",
    title: "Your event history",
    text: "Every competition you enter stays on your profile. Your battles, your placements, your wins — your record follows you.",
  },
  {
    number: "05",
    title: "Networking",
    text: "Connect with artists, organizers, and judges across the scene. Crew up, collab, and stay plugged into what is happening.",
  },
  {
    number: "06",
    title: "Gigs & freelance work",
    text: "Turn the floor into income. Get hired for paid performances, choreography, DJ sets, and freelance work from organizers who saw you battle.",
  },
];

const steps = [
  { number: "01", title: "Create your profile", text: "Tell the scene who you are — your style, your crew, your city." },
  { number: "02", title: "Find your event", text: "Get updates and pick the competitions you want to enter." },
  { number: "03", title: "Register & pay", text: "Join categories online and pay your entry through UPI." },
  { number: "04", title: "Battle & get hired", text: "Get scored live, rank up, and land the gigs." },
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
            Build your name.
          </h1>
          <p className="mt-md max-w-2xl text-body-md text-ink-muted">
            Compete, get scored live, and turn the floor into work. CYPHR puts your
            talent in front of organizers who hire.
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
              Browse competitions
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
            Everything to take you from the floor to the stage.
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
          The floor is calling.
        </h2>
        <p className="mx-auto mt-md max-w-4xl text-body-md text-ink-muted">
          Dancers, DJs, guitarists, drummers, performers — your profile is your
          resume. Build it now and let the work find you.
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
