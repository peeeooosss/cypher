import Link from "next/link";
import { getAdminStats, requireAdmin } from "@/lib/admin";
import { formatInr } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const stats = await getAdminStats();

  const roleLabels: Record<string, string> = {
    ORGANIZER: "Organizers",
    ARTIST: "Artists",
    JUDGE: "Judges",
    ADMIN: "Admins",
  };

  const statusLabels: Record<string, string> = {
    DRAFT: "Draft",
    PUBLISHED: "Published",
    LIVE: "Live",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };

  return (
    <div className="space-y-section">
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={String(stats.userTotal)} sub={Object.entries(stats.users).map(([role, count]) => `${roleLabels[role] ?? role}: ${count}`).join(" · ")} />
        <StatCard label="Total events" value={String(stats.eventTotal)} sub={Object.entries(stats.events).map(([status, count]) => `${statusLabels[status] ?? status}: ${count}`).join(" · ")} />
        <StatCard label="Entries" value={String(stats.registrations)} sub={`${stats.teamEntries} team entries`} />
        <StatCard label="Competitions" value={String(stats.categoryCount)} sub="Total categories" />
      </div>

      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Artists" value={String(stats.users.ARTIST ?? 0)} />
        <StatCard label="Organizations" value={String(stats.users.ORGANIZER ?? 0)} />
        <StatCard label="Gigs" value={String(stats.gigCount)} sub={`${stats.gigsOpen} open`} />
        <StatCard label="Pending flat fees" value={String(stats.flatFeePending)} sub={`${stats.gigWorkPending} gig-work pending`} />
        <StatCard label="Team members" value={String(stats.teamMembers)} sub={`${stats.pendingInvitations} invitations pending`} />
      </div>

      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Flat fee revenue" value={formatInr(stats.flatFeeRevenue)} sub="Verified flat fees" />
        <StatCard label="Commission collected" value={formatInr(stats.commissionRevenue)} sub="Settled commissions" />
        <StatCard label="Gig work revenue" value={formatInr(stats.gigWorkRevenue)} sub="₹49 marketplace access" />
        <StatCard label="Commission due" value={formatInr(stats.commissionDue)} sub="Outstanding" />
      </div>

      <div className="grid gap-md lg:grid-cols-2">
        <Link href="/admin/payments" className="group border border-line bg-paper-soft p-lg transition-colors hover:border-accent">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">Verification hub</p>
          <h2 className="mt-sm font-display text-title-md uppercase group-hover:text-accent">Payments</h2>
          <p className="mt-sm text-body-sm text-ink-muted">
            Review pending flat fees, commissions and gig-work payments, verify transfers, or reopen incorrect ones.
          </p>
        </Link>
        <Link href="/admin/organizers" className="group border border-line bg-paper-soft p-lg transition-colors hover:border-accent">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">Account management</p>
          <h2 className="mt-sm font-display text-title-md uppercase group-hover:text-accent">Organizations</h2>
          <p className="mt-sm text-body-sm text-ink-muted">
            View organizer records and suspend accounts when needed.
          </p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-line bg-paper-soft p-lg">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">{label}</p>
      <p className="mt-sm font-display text-title-md uppercase">{value}</p>
      {sub ? <p className="mt-sm text-body-sm text-ink-muted">{sub}</p> : null}
    </div>
  );
}
