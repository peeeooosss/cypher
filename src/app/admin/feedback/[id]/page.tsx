import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminFeedbackItem, requireAdmin } from "@/lib/admin";
import { FeedbackStatus, FeedbackType } from "@/generated/prisma/enums";
import { FeedbackStatusActions } from "@/components/feedback-status-actions";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
} from "@/lib/feedback";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminFeedbackDetailPage({ params }: PageProps) {
  const { id } = await params;
  await requireAdmin();
  const feedback = await getAdminFeedbackItem(id);

  if (!feedback) {
    notFound();
  }

  return (
    <div className="space-y-section">
      <Link href="/admin/feedback" className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent">
        &larr; Back to inbox
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-md border border-line bg-paper-soft p-lg">
        <div>
          <div className="flex flex-wrap items-center gap-sm">
            <h2 className="font-display text-title-md uppercase">{feedback.subject}</h2>
            <span className={`font-mono text-[0.7rem] uppercase ${feedback.type === FeedbackType.DEMAND ? "text-accent" : "text-ink-muted"}`}>
              {FEEDBACK_TYPE_LABELS[feedback.type]}
            </span>
            <span className="font-mono text-[0.7rem] uppercase text-ink-muted">
              {FEEDBACK_STATUS_LABELS[feedback.status]}
            </span>
          </div>
          <p className="mt-sm text-body-sm text-ink-muted">
            {feedback.name ?? "Anonymous"}
            {feedback.email ? ` · ${feedback.email}` : ""} ·{" "}
            {feedback.createdAt.toLocaleString()}
          </p>
          {feedback.resolvedAt ? (
            <p className="mt-sm text-body-sm text-ink-muted">
              Resolved by {feedback.resolvedBy ?? "admin"} on {feedback.resolvedAt.toLocaleString()}
            </p>
          ) : null}
        </div>
        <FeedbackStatusActions id={feedback.id} current={feedback.status as FeedbackStatus} />
      </div>

      <div className="border border-line bg-paper-soft p-lg">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Message</p>
        <p className="mt-md max-w-prose whitespace-pre-wrap text-body-sm leading-relaxed">
          {feedback.message}
        </p>
      </div>
    </div>
  );
}
