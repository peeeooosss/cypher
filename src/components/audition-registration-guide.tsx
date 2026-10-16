"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

export function AuditionRegistrationGuide({
  contactDetails,
}: {
  contactDetails?: string | null;
}) {
  const driveLinks = {
    solo: "https://drive.google.com/file/d/1DDx12p8vPhTEMh5FibGaQYhE0RGCmUYp/view?usp=drivesdk",
    team: "https://drive.google.com/file/d/1Vk8ngRU_NRRZHWUlSgxm78jYIFK46OT0/view?usp=drivesdk",
  };

  const hasContact = Boolean(contactDetails?.trim());

  return (
    <section className="mt-lg border border-line bg-paper-soft">
      <div className="border-b border-line px-lg py-md">
        <p className="font-display text-title-md uppercase">Audition registration guide</p>
        <p className="mt-xs text-body-sm text-ink-muted">
          Watch these short videos before you start. For online auditions, share your audition video directly to the organizer’s WhatsApp number (see Contact below).
        </p>
      </div>
      <div className="grid gap-md p-lg sm:grid-cols-2">
        <GuideVideoCard
          title="SOLO PARTICIPATIONS"
          subtitle="How to register for SOLO — online & offline auditions"
          href={driveLinks.solo}
        />
        <GuideVideoCard
          title="DUO TRIO GROUP PARTICIPATIONS"
          subtitle="How to register for DUO / TRIO / GROUP — online & offline auditions"
          href={driveLinks.team}
        />
      </div>
      {hasContact && (
        <div className="border-t border-line px-lg py-sm">
          <p className="text-body-sm text-ink-muted">
            Organizer contact (for WhatsApp verification & online video share):{" "}
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
            <p className="font-bold uppercase">2. Register for SOLO</p>
            <ul className="mt-xs list-disc space-y-xs pl-5 text-ink-muted">
              <li>Select your audition type: Offline (Guwahati / Dibrugarh / Tezpur) or Online.</li>
              <li>Pick the SOLO category from the list.</li>
              <li>Enter your Choreographer name (no crew name needed for solo) and continue.</li>
              <li>You’ll reach the cart — pay the entry fee. After payment, tap “I have paid” and send the payment screenshot to the organizer on WhatsApp for verification.</li>
            </ul>
          </li>
          <li>
            <p className="font-bold uppercase">3. Register for DUO / TRIO / GROUP</p>
            <ul className="mt-xs list-disc space-y-xs pl-5 text-ink-muted">
              <li>Select your audition type (Offline by city, or Online).</li>
              <li>Pick the DUO / TRIO / GROUP category.</li>
              <li>Enter your <span className="text-ink">Crew name</span> and <span className="text-ink">Choreographer name</span>. Only the captain creates an account and registers the whole crew — there is no member search or invite step.</li>
              <li>Continue to cart and pay as captain.</li>
              <li>After payment, tap “I have paid” and send the payment screenshot to the organizer on WhatsApp for verification.</li>
            </ul>
          </li>
          <li>
            <p className="font-bold uppercase">4. After registration</p>
            <ul className="mt-xs list-disc space-y-xs pl-5 text-ink-muted">
              <li>For ONLINE auditions: share your audition video directly to the organizer’s WhatsApp number (from Contact). No upload on the website.</li>
              <li>Check your cart/status at any time. The “Verify now” button uses the structured WhatsApp message for quick verification.</li>
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
