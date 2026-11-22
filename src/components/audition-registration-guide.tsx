"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

export function AuditionRegistrationGuide({
  contactDetails,
}: {
  contactDetails?: string | null;
}) {
  const driveLinks = {
    solo: "https://drive.google.com/file/d/1sWl897-hjmwHrgfKUNCb5deGHa6uf9Lx/view?usp=drivesdk",
    team: "https://drive.google.com/file/d/1sWl897-hjmwHrgfKUNCb5deGHa6uf9Lx/view?usp=drivesdk",
  };

  const hasContact = Boolean(contactDetails?.trim());

  return (
    <section className="mt-lg border border-line bg-paper-soft">
      <div className="border-b border-line px-lg py-md">
        <p className="font-display text-title-md uppercase">Audition registration guide</p>
        <p className="mt-xs text-body-sm text-ink-muted">
          Watch this short video before you start. You will register in one form: select city, category, add choreographer, and upload your music file.
        </p>
      </div>
      <div className="gap-md p-lg">
        <GuideVideoCard
          title="REGISTRATION GUIDE"
          subtitle="How to register — SOLO, DUO, TRIO & GROUP (online & offline auditions)"
          href={driveLinks.solo}
        />
      </div>
      {hasContact && (
        <div className="border-t border-line px-lg py-sm">
          <p className="text-body-sm text-ink-muted">
            Organizer contact (for WhatsApp verification):{" "}
            <span className="font-mono text-[0.7rem] uppercase text-ink">{contactDetails}</span>
          </p>
        </div>
      )}
      <div className="border-t border-line px-lg py-md">
        <p className="font-display text-title-sm uppercase">Step-by-step instructions</p>
        <ol className="mt-sm space-y-md text-body-sm leading-relaxed text-ink">
          <li>
            <p className="font-bold uppercase">1. Create your account & complete your artist profile</p>
            <ul className="mt-xs list-disc space-y-xs pl-5 text-ink-muted">
              <li>
                Go to{" "}
                <Link href="/signup" className="text-accent underline decoration-accent underline-offset-4 hover:opacity-80">
                  /signup
                </Link>{" "}
                (or{" "}
                <Link href="/login" className="text-accent underline decoration-accent underline-offset-4 hover:opacity-80">
                  /login
                </Link>{" "}
                if you already have one).
              </li>
              <li>Add your name, 10-digit phone number, city, crew & dance style on your Artist profile.</li>
              <li>Return to this page to register once your profile is complete.</li>
            </ul>
          </li>
          <li>
            <p className="font-bold uppercase">2. Fill the qualifier form</p>
            <ul className="mt-xs list-disc space-y-xs pl-5 text-ink-muted">
              <li>Enter your <span className="text-ink">Age</span>, select your <span className="text-ink">City</span>, and pick your <span className="text-ink">Category</span>.</li>
              <li>Add <span className="text-ink">Choreographer name</span>. For DUO/TRIO/GROUP, captain also adds <span className="text-ink">Crew name</span> and registers the whole crew.</li>
              <li>Upload your <span className="text-ink">Music file</span> (MP3/WAV/M4A/AAC, max 20MB).</li>
            </ul>
          </li>
          <li>
            <p className="font-bold uppercase">3. Pay and verify</p>
            <ul className="mt-xs list-disc space-y-xs pl-5 text-ink-muted">
              <li>Continue to cart and pay the entry fee.</li>
              <li>After payment, tap “Paid & Verify Now”. This reports your payment to the organizer dashboard and opens WhatsApp so you can send your screenshot.</li>
              <li>Check your cart/status at any time. If needed, use the WhatsApp link in cart to resend your screenshot for quick verification.</li>
            </ul>
          </li>
        </ol>
      </div>
    </section>
  );
}

function GuideVideoCard({
  title,
  subtitle,
  href,
  className = "",
  ...rest
}: {
  title: string;
  subtitle: string;
  href: string;
} & ComponentPropsWithoutRef<"a">) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block border border-line bg-paper transition-colors hover:border-accent ${className}`}
      {...rest}
    >
      <div className="relative aspect-video w-full bg-ink/5">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent bg-accent/90 text-paper transition-transform group-hover:scale-105 sm:h-14 sm:w-14">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5 translate-x-0.5 sm:h-6 sm:w-6"
              aria-hidden
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="border-t border-line px-md py-sm">
        <p className="font-display text-title-sm uppercase tracking-[-0.01em]">{title}</p>
        <p className="mt-xs text-body-sm text-ink-muted">{subtitle}</p>
        <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.15em] text-accent">Watch on Google Drive →</p>
      </div>
    </a>
  );
}
