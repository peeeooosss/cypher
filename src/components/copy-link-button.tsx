"use client";

import { useState } from "react";

export function CopyLinkButton({
  path,
  label = "Copy link",
  copiedLabel = "Copied",
  className,
  title,
}: {
  path: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      const url = new URL(path, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context / permissions) — nothing to do.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={title}
      className={
        className ??
        "font-mono text-[0.65rem] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-accent"
      }
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
