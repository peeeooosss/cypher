import Link from "next/link";

export const metadata = {
  title: "Offline | CYPHR",
  description: "You are offline. Reconnect to get back in the circle.",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-md py-section text-center">
      <p className="text-body-xs font-bold uppercase tracking-[0.2em] text-accent">No connection</p>
      <h1 className="mt-2 font-display text-display-lg uppercase">Beat dropped, signal lost</h1>
      <p className="mt-2 max-w-md text-body-sm text-ink-muted">
        You&apos;re offline. Live judging and scores need a connection — reconnect and pick up
        right where you left off.
      </p>
      <div className="mt-lg">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-button-md text-accent-contrast transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Retry
        </Link>
      </div>
    </main>
  );
}
