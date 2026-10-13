import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-md py-section text-center">
      <p className="font-display text-score-display text-accent">404</p>
      <h1 className="mt-2 font-display text-display-lg uppercase">Off the stage</h1>
      <p className="mt-2 max-w-md text-body-sm text-ink-muted">
        This page doesn&apos;t exist or was moved. Head back and find your battle.
      </p>
      <div className="mt-lg flex flex-wrap items-center justify-center gap-sm">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-button-md text-accent-contrast transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Back home
        </Link>
        <Link
          href="/events"
          className="inline-flex h-11 items-center justify-center rounded-md border border-line-strong px-5 text-button-md text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Browse events
        </Link>
      </div>
    </main>
  );
}
