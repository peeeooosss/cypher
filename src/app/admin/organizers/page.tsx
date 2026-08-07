import Link from "next/link";
import { getAdminOrganizers, requireAdmin } from "@/lib/admin";
import { AdminSuspendButton } from "@/components/admin-suspend-button";

export const dynamic = "force-dynamic";

export default async function AdminOrganizersPage() {
  await requireAdmin();
  const organizers = await getAdminOrganizers();

  return (
    <div>
      <h2 className="font-display text-title-md uppercase">Organizations</h2>
      {organizers.length === 0 ? (
        <p className="mt-md border border-line p-lg text-ink-muted">No organizers yet.</p>
      ) : (
        <div className="mt-md overflow-x-auto">
          <table className="w-full border border-line text-body-sm">
            <thead>
              <tr className="border-b border-line bg-paper-soft text-left">
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Name</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Email</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">UPI</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Events</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Gigs</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Joined</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Status</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizers.map((organizer) => (
                <tr key={organizer.id} className="border-b border-line">
                  <td className="px-md py-sm">
                    <Link className="font-bold uppercase hover:text-accent" href={`/admin/organizers/${organizer.id}`}>
                      {organizer.name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-md py-sm">{organizer.email}</td>
                  <td className="px-md py-sm font-mono text-ink-muted">{organizer.upiId ?? "—"}</td>
                  <td className="px-md py-sm">{organizer._count.organizedEvents}</td>
                  <td className="px-md py-sm">{organizer._count.gigs}</td>
                  <td className="px-md py-sm">{organizer.createdAt.toLocaleDateString()}</td>
                  <td className="px-md py-sm">
                    {organizer.isSuspended ? (
                      <span className="font-mono text-[0.7rem] uppercase text-accent">Suspended</span>
                    ) : (
                      <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Active</span>
                    )}
                  </td>
                  <td className="px-md py-sm">
                    <AdminSuspendButton userId={organizer.id} isSuspended={organizer.isSuspended} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
