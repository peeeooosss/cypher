import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminArtist, requireAdmin } from "@/lib/admin";
import { AdminArtistActions } from "@/components/admin-artist-actions";
import { formatInr } from "@/lib/pricing";
import { formatExperience } from "@/lib/format";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ userId: string }> };

export default async function AdminArtistDetailPage({ params }: PageProps) {
  const { userId } = await params;
  await requireAdmin();
  const artist = await getAdminArtist(userId);

  if (!artist) {
    notFound();
  }

  const now = new Date();
  const gigWorkActive = artist.gigWorkExpiresAt != null && artist.gigWorkExpiresAt > now;

  return (
    <div className="space-y-section">
      <Link href="/admin/artists" className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent">
        &larr; Back to artists
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-md border border-line bg-paper-soft p-lg">
        <div>
          <h2 className="font-display text-title-md uppercase">{artist.name ?? "Unnamed"}</h2>
          <p className="mt-xs text-body-sm text-ink-muted">{artist.email}</p>
          <p className="mt-xs text-body-sm text-ink-muted">
            {[artist.style, artist.crew, artist.city, artist.country, formatExperience(artist.experience)].filter(Boolean).join(" · ") || "—"}
          </p>
          {artist.socialHandle ? (
            <p className="mt-xs text-body-sm text-ink-muted">{artist.socialHandle} · {artist.referral ?? "no referral"}</p>
          ) : null}
          {artist.skills.length > 0 ? (
            <p className="mt-xs text-body-sm text-ink-muted">Skills: {artist.skills.join(", ")}</p>
          ) : null}
          <p className="mt-xs text-body-sm text-ink-muted">Joined {artist.createdAt.toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-sm">
          {artist.isSuspended ? (
            <span className="border border-accent bg-accent/10 px-md py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
              Suspended
            </span>
          ) : null}
          {artist.gigWorkEnabledAt ? (
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
              Gig work: {gigWorkActive ? `active until ${artist.gigWorkExpiresAt!.toLocaleDateString()}` : "expired"}
            </span>
          ) : null}
          <AdminArtistActions
            userId={artist.id}
            isSuspended={artist.isSuspended}
            gigWorkEnabled={gigWorkActive || (artist.gigWorkEnabledAt != null && artist.gigWorkExpiresAt == null)}
          />
        </div>
      </div>

      <div className="grid gap-md sm:grid-cols-4">
        <Stat label="Captain entries" value={String(artist._count.registrations)} />
        <Stat label="Team memberships" value={String(artist._count.teamMemberships)} />
        <Stat label="Achievements" value={String(artist._count.achievements)} />
        <Stat label="Gig applications" value={String(artist._count.gigApplications)} />
      </div>

      <div>
        <h3 className="font-display text-title-md uppercase">Accepted team memberships ({artist.memberships.length})</h3>
        {artist.memberships.length === 0 ? <p className="mt-md border border-line p-lg text-ink-muted">No team memberships.</p> : (
          <div className="mt-md space-y-sm">
            {artist.memberships.map((membership) => (
              <div className="border border-line bg-paper-soft p-md" key={membership.id}>
                <p className="font-bold uppercase">{membership.registration.teamName ?? membership.registration.category.name}</p>
                <p className="mt-xs text-body-sm text-ink-muted">{membership.registration.category.event.title} · {membership.registration.category.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display text-title-md uppercase">Achievements ({artist.achievements.length})</h3>
        {artist.achievements.length === 0 ? (
          <p className="mt-md border border-line p-lg text-ink-muted">No achievements.</p>
        ) : (
          <div className="mt-md overflow-x-auto">
            <table className="w-full border border-line text-body-sm">
              <thead>
                <tr className="border-b border-line bg-paper-soft text-left">
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Title</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Competition</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Placement</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Year</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Prize</th>
                </tr>
              </thead>
              <tbody>
                {artist.achievements.map((a) => (
                  <tr key={a.id} className="border-b border-line">
                    <td className="px-md py-sm">{a.title}</td>
                    <td className="px-md py-sm">{a.competition}</td>
                    <td className="px-md py-sm">{a.placement}</td>
                    <td className="px-md py-sm">{a.year}</td>
                    <td className="px-md py-sm font-mono text-accent">{formatInr(a.prize ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display text-title-md uppercase">Registrations ({artist.registrations.length})</h3>
        {artist.registrations.length === 0 ? (
          <p className="mt-md border border-line p-lg text-ink-muted">No registrations.</p>
        ) : (
          <div className="mt-md overflow-x-auto">
            <table className="w-full border border-line text-body-sm">
              <thead>
                <tr className="border-b border-line bg-paper-soft text-left">
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Event</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Category</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Status</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Fee</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Paid</th>
                </tr>
              </thead>
              <tbody>
                {artist.registrations.map((reg) => (
                  <tr key={reg.id} className="border-b border-line">
                    <td className="px-md py-sm">{reg.category.event.title}</td>
                    <td className="px-md py-sm">{reg.category.name}</td>
                    <td className="px-md py-sm">{reg.status}</td>
                    <td className="px-md py-sm font-mono text-accent">{formatInr(reg.entryFee ?? 0)}</td>
                    <td className="px-md py-sm">{reg.paid ? "Yes" : "No"}</td>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-paper-soft p-lg">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">{label}</p>
      <p className="mt-sm font-display text-title-md uppercase">{value}</p>
    </div>
  );
}
