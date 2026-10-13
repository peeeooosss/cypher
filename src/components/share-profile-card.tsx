"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";

export function ShareProfileCard({
  handle,
  url,
  qrDataUrl,
  isPublic,
}: {
  handle: string | null;
  url: string | null;
  qrDataUrl: string | null;
  isPublic: boolean;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!handle || !url) {
    return (
      <section className="mt-section rounded-lg border border-dashed border-line-strong bg-paper-soft p-lg">
        <p className="font-display text-title-md uppercase">Share your portfolio</p>
        <p className="mt-sm max-w-xl text-body-sm text-ink-muted">
          Set a username on your profile to unlock your public portfolio link
          (<span className="font-mono">/artist/@you</span>) with preview, copy link, and QR sharing.
        </p>
      </section>
    );
  }

  const profileUrl: string = url ?? "";
  const profileHandle: string = handle ?? "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast("Portfolio link copied", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy the link — long-press the URL to copy it", "error");
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `CYPHR — @${profileHandle}`, text: `Check out @${profileHandle} on CYPHR`, url: profileUrl });
      } catch {
        // User dismissed the share sheet — no action needed.
      }
      return;
    }
    await copyLink();
  }

  return (
    <section className="mt-section rounded-lg border border-line bg-paper-soft p-lg">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <p className="text-body-xs font-bold uppercase tracking-[0.2em] text-accent">
            Portfolio link
          </p>
          <p className="mt-1 font-display text-title-md uppercase">@{handle}</p>
          <p className="mt-1 truncate font-mono text-body-sm text-ink-muted">{url}</p>
          {!isPublic && (
            <p className="mt-2 max-w-xl text-body-sm text-warning">
              Your profile is currently private — only you can see it. Make it public to share it
              with organizers and fans.
            </p>
          )}
        </div>
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt={`QR code for @${handle} portfolio`}
            width={120}
            height={120}
            className="h-[120px] w-[120px] shrink-0 rounded-md border border-line bg-white p-1"
          />
        ) : null}
      </div>
      <div className="mt-md flex flex-wrap gap-sm">
        <Link
          href={url.replace(/^https?:\/\/[^/]+/, "")}
          className="inline-flex h-11 items-center justify-center rounded-md border border-line-strong px-5 text-button-md text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Preview
        </Link>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-accent px-5 text-button-md text-accent-contrast transition-all hover:brightness-110 active:scale-[0.98]"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-paper px-5 text-button-md text-ink transition-colors hover:bg-paper-raised"
        >
          Share
        </button>
      </div>
    </section>
  );
}
