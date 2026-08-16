import Link from "next/link";
import { getAdminFeedback, requireAdmin } from "@/lib/admin";
import { FeedbackStatus, FeedbackType } from "@/generated/prisma/enums";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_ORDER,
  FEEDBACK_TYPE_LABELS,
} from "@/lib/feedback";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const { feedback, byStatus } = await getAdminFeedback();

  const activeStatus = (FEEDBACK_STATUS_ORDER as string[]).includes(params.status ?? "")
    ? (params.status as FeedbackStatus)
    : null;

  const rows = activeStatus
    ? feedback.filter((f) => f.status === activeStatus)
    : feedback;

  return (
    <div className="space-y-section">
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total" value={String(feedback.length)} />
        {FEEDBACK_STATUS_ORDER.map((status) => (
          <StatCard
            key={status}
            label={FEEDBACK_STATUS_LABELS[status]}
            value={String(byStatus[status] ?? 0)}
            accent={status === FeedbackStatus.NEW}
          />
        ))}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h2 className="font-display text-title-md uppercase">Inbox</h2>
          <div className="flex flex-wrap gap-xs">
            <Link
              href="/admin/feedback"
              className={`border px-sm py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] ${
                activeStatus === null ? "border-accent text-accent" : "border-line text-ink-muted hover:text-accent"
              }`}
            >
              All ({feedback.length})
            </Link>
            {FEEDBACK_STATUS_ORDER.map((status) => (
              <Link
                key={status}
                href={`/admin/feedback?status=${status}`}
                className={`border px-sm py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] ${
                  activeStatus === status ? "border-accent text-accent" : "border-line text-ink-muted hover:text-accent"
                }`}
              >
                {FEEDBACK_STATUS_LABELS[status]} ({byStatus[status] ?? 0})
              </Link>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="mt-md border border-line p-lg text-ink-muted">No feedback yet.</p>
        ) : (
          <div className="mt-md overflow-x-auto">
            <table className="w-full border border-line text-body-sm">
              <thead>
                <tr className="border-b border-line bg-paper-soft text-left">
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Status</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Type</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Name</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Subject</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id} className="border-b border-line">
                    <td className="px-md py-sm">
                      <span
                        className={`font-mono text-[0.7rem] uppercase ${
                          f.status === FeedbackStatus.NEW ? "text-accent" : "text-ink-muted"
                        }`}
                      >
                        {FEEDBACK_STATUS_LABELS[f.status]}
                      </span>
                    </td>
                    <td className="px-md py-sm">
                      <span
                        className={`font-mono text-[0.7rem] uppercase ${
                          f.type === FeedbackType.DEMAND ? "text-accent" : "text-ink-muted"
                        }`}
                      >
                        {FEEDBACK_TYPE_LABELS[f.type]}
                      </span>
                    </td>
                    <td className="px-md py-sm">{f.name ?? "—"}</td>
                    <td className="px-md py-sm">
                      <Link className="font-bold uppercase hover:text-accent" href={`/admin/feedback/${f.id}`}>
                        {f.subject}
                      </Link>
                    </td>
                    <td className="px-md py-sm">{f.createdAt.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-line bg-paper-soft p-lg">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">{label}</p>
      <p className={`mt-sm font-display text-title-md uppercase ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}
