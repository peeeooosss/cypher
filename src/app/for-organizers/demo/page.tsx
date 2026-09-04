import type { Metadata } from "next";
import Link from "next/link";
import { JudgePortalDemo } from "@/components/judge-portal-demo";

export const metadata: Metadata = {
  title: "Judge Portal Demo | CYPHR",
  description:
    "Preview CYPHR's 4-section live scoring for battles, cyphers, and qualifiers — no login required.",
};

export default function JudgePortalDemoPage() {
  return (
    <main className="min-h-screen bg-paper">
      <JudgePortalDemo />
      <section className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-md px-md py-section md:px-xl">
          <div>
            <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
              Ready to run it for real?
            </p>
            <h2 className="mt-sm font-display text-display-md uppercase">
              Create your event, invite judges, score live.
            </h2>
          </div>
          <div className="flex flex-wrap gap-sm">
            <Link
              href="/signup"
              className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper transition-opacity hover:opacity-80"
            >
              Sign up as organizer
            </Link>
            <Link
              href="/for-organizers"
              className="border border-line px-lg py-sm text-button-md font-bold uppercase text-ink transition-colors hover:border-accent"
            >
              Back to for organizers
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
