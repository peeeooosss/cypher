import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminOrganizer, requireAdmin } from "@/lib/admin";
import { formatInr } from "@/lib/pricing";
import { AdminSuspendButton } from "@/components/admin-suspend-button";
import { AdminDeleteButton } from "@/components/admin-delete-button";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ userId: string }> };

export default async function AdminOrganizerDetailPage({ params }: PageProps) {
  const { userId } = await params;
  await requireAdmin();
  const organizer = await getAdminOrganizer(userId);

  if (!organizer) {
    notFound();
  }

  return (
    <div className="space-y-section">
      <Link href="/admin/organizers" className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent">
        &larr; Back to organizations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-md border border-line bg-paper-soft p-lg">
        <div>
          <h2 className="font-display text-title-md uppercase">{organizer.name ?? "Unnamed"}</h2>
          <p className="mt-xs text-body-sm text-ink-muted">{organizer.email}</p>
          <p className="mt-xs text-body-sm text-ink-muted">
            UPI {organizer.upiId ?? "—"} · Joined {organizer.createdAt.toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-sm">
          {organizer.isSuspended ? (
            <span className="border border-accent bg-accent/10 px-md py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
              Suspended
            </span>
          ) : null}
          <AdminSuspendButton userId={organizer.id} isSuspended={organizer.isSuspended} />
          <AdminDeleteButton userId={organizer.id} apiPath="/api/admin/organizers" />
        </div>
      </div>

      <div>
        <h3 className="font-display text-title-md uppercase">Events ({organizer.events.length})</h3>
        {organizer.events.length === 0 ? (
          <p className="mt-md border border-line p-lg text-ink-muted">No events.</p>
        ) : (
          <div className="mt-md overflow-x-auto">
            <table className="w-full border border-line text-body-sm">
              <thead>
                <tr className="border-b border-line bg-paper-soft text-left">
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Title</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Status</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Flat fee</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Commission</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Regs</th>
                </tr>
              </thead>
              <tbody>
                {organizer.events.map((event) => (
                  <tr key={event.id} className="border-b border-line">
                    <td className="px-md py-sm">
                      <Link className="font-bold uppercase hover:text-accent" href={`/organizer/${event.id}`}>
                        {event.title}
                      </Link>
                    </td>
                    <td className="px-md py-sm">{event.status}</td>
                    <td className="px-md py-sm">
                      <span className="font-mono text-accent">{formatInr(event.flatFee ?? 0)}</span>{" "}
                      <span className="text-ink-muted">{event.flatFeePaid ? "paid" : event.flatFeePaymentStatus}</span>
                    </td>
                    <td className="px-md py-sm">
                      {event.commissionDue ? `${formatInr(event.commissionDue)}` : "—"}{" "}
                      {event.commissionPaid ? <span className="text-ink-muted">paid</span> : null}
                    </td>
                    <td className="px-md py-sm">{event._count.categories} cats</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display text-title-md uppercase">Gigs ({organizer.gigs.length})</h3>
        {organizer.gigs.length === 0 ? (
          <p className="mt-md border border-line p-lg text-ink-muted">No gigs.</p>
        ) : (
          <div className="mt-md overflow-x-auto">
            <table className="w-full border border-line text-body-sm">
              <thead>
                <tr className="border-b border-line bg-paper-soft text-left">
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Title</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Budget</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Status</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Posted</th>
                </tr>
              </thead>
              <tbody>
                {organizer.gigs.map((gig) => (
                  <tr key={gig.id} className="border-b border-line">
                    <td className="px-md py-sm">{gig.title}</td>
                    <td className="px-md py-sm font-mono text-accent">{formatInr(gig.budget ?? 0)}</td>
                    <td className="px-md py-sm">{gig.status}</td>
                    <td className="px-md py-sm">{gig.createdAt.toLocaleDateString()}</td>
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
