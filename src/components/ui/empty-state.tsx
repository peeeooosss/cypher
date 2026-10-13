import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-paper-soft px-6 py-12 text-center">
      <p className="font-display text-display-sm uppercase tracking-wide">{title}</p>
      {description && <p className="max-w-sm text-body-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-md flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-body-xs font-bold uppercase tracking-[0.2em] text-accent">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-display-md uppercase tracking-wide">{title}</h2>
        {description && <p className="mt-1 max-w-xl text-body-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
