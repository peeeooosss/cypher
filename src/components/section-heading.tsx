import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string | null;
  action?: ReactNode;
}) {
  return (
    <div className="mb-lg flex flex-wrap items-end justify-between gap-md">
      <div className="min-w-0">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.25em] text-accent">{eyebrow}</p>
        <h2 className="mt-sm font-display text-display-md uppercase leading-none tracking-[-0.01em]">
          {title}
        </h2>
        {description ? (
          <p className="mt-sm max-w-prose text-body-md leading-relaxed text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
