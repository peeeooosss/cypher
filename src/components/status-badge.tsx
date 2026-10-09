import type { EventStatus } from "@/generated/prisma/enums";

const styles: Record<EventStatus, string> = {
  DRAFT: "border-line text-ink-muted",
  PUBLISHED: "border-line text-ink",
  LIVE: "border-accent bg-accent/10 text-accent",
  COMPLETED: "border-line text-ink-muted",
  CANCELLED: "border-line text-ink-muted line-through",
};

const dots: Record<EventStatus, string> = {
  DRAFT: "bg-ink-muted",
  PUBLISHED: "bg-ink",
  LIVE: "bg-accent animate-pulse-soft",
  COMPLETED: "bg-ink-muted",
  CANCELLED: "bg-ink-muted",
};

const labels: Record<EventStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Upcoming",
  LIVE: "Live now",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex items-center gap-xs border px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.15em] ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dots[status]}`} />
      {labels[status]}
    </span>
  );
}