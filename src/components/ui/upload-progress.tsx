"use client";

import { cx } from "./cx";

export type UploadStatus = "idle" | "uploading" | "saving" | "success" | "error";

export function UploadProgress({
  status,
  progress = 0,
  successLabel = "Uploaded successfully",
  errorLabel,
  className,
}: {
  status: UploadStatus;
  progress?: number;
  successLabel?: string;
  errorLabel?: string;
  className?: string;
}) {
  if (status === "idle") return null;

  const isError = status === "error";
  const isSuccess = status === "success";
  const pct = isSuccess || status === "saving" ? 100 : Math.round(Math.max(0, Math.min(100, progress)));

  const label = isError
    ? errorLabel || "Upload failed. Please try again."
    : isSuccess
      ? successLabel
      : status === "saving"
        ? "Saving…"
        : `Uploading… ${pct}%`;

  return (
    <div className={cx("mt-sm", className)} role="status" aria-live="polite">
      <p
        className={cx(
          "font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em]",
          isError ? "text-accent" : isSuccess ? "text-success" : "text-ink-muted",
        )}
      >
        {isSuccess ? <span aria-hidden>{"\u2713 "}</span> : null}
        {label}
      </p>
      {isSuccess ? null : (
        <div className="mt-xs h-1.5 w-full overflow-hidden rounded-full bg-paper-raised">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={isError ? undefined : pct}
            className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
