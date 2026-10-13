"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-md py-section text-center">
      <p className="text-body-xs font-bold uppercase tracking-[0.2em] text-accent">Something broke</p>
      <h1 className="mt-2 font-display text-display-lg uppercase">The circle dropped</h1>
      <p className="mt-2 max-w-md text-body-sm text-ink-muted">
        Something went wrong on our side. Try again — your spot in the cypher is safe.
        {error.digest ? ` (ref ${error.digest})` : ""}
      </p>
      <div className="mt-lg flex flex-wrap items-center justify-center gap-sm">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-md border border-line-strong px-5 text-button-md text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
