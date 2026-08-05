import type { EventStatus } from "@/generated/prisma/enums";

const styles: Record<EventStatus, string> = {
  DRAFT: "border-line text-ink-muted",
  PUBLISHED: "border-line text-ink",
  LIVE: "border-accent text-accent",
  COMPLETED: "border-line text-ink-muted",
  CANCELLED: "border-line text-ink-muted line-through",
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
    <span className={`inline-block border px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.15em] ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}