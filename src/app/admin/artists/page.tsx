import Link from "next/link";
import { getAdminArtists, requireAdmin } from "@/lib/admin";
import { AdminDeleteButton } from "@/components/admin-delete-button";

export const dynamic = "force-dynamic";

export default async function AdminArtistsPage() {
  await requireAdmin();
  const artists = await getAdminArtists();

  return (
    <div>
      <h2 className="font-display text-title-md uppercase">Artists</h2>
      {artists.length === 0 ? (
        <p className="mt-md border border-line p-lg text-ink-muted">No artists yet.</p>
      ) : (
        <div className="mt-md overflow-x-auto">
          <table className="w-full border border-line text-body-sm">
            <thead>
              <tr className="border-b border-line bg-paper-soft text-left">
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Name</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Email</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Profile</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Style</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Crew</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">City</th>
                 <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Entries / teams</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Gig work</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Status</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {artists.map((artist) => {
                const gigWorkActive = artist.gigWorkExpiresAt != null && artist.gigWorkExpiresAt > new Date();
                return (
                  <tr key={artist.id} className="border-b border-line">
                    <td className="px-md py-sm">
                      <div className="flex items-center gap-sm">
                        {artist.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={artist.avatarUrl} alt={artist.name ?? ""} className="h-8 w-8 rounded-full border border-line object-cover" />
                        ) : null}
                        <Link className="font-bold uppercase hover:text-accent" href={`/admin/artists/${artist.id}`}>
                          {artist.name ?? "—"}
                        </Link>
                      </div>
                    </td>
                    <td className="px-md py-sm">{artist.email}</td>
                    <td className="px-md py-sm">
                      {artist.isProfilePublic ? (
                        <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Public</span>
                      ) : (
                        <span className="font-mono text-[0.7rem] uppercase text-accent">Private</span>
                      )}
                    </td>
                    <td className="px-md py-sm">{artist.style ?? "—"}</td>
                    <td className="px-md py-sm">{artist.crew ?? "—"}</td>
                    <td className="px-md py-sm">{artist.city ?? "—"}</td>
                     <td className="px-md py-sm">{artist._count.registrations} / {artist._count.teamMemberships}</td>
                    <td className="px-md py-sm">
                      {artist.gigWorkEnabledAt ? (
                        <span className="font-mono text-[0.7rem] uppercase text-accent">
                          {gigWorkActive ? "Active" : "Expired"}
                        </span>
                      ) : (
                        <span className="font-mono text-[0.7rem] uppercase text-ink-muted">No</span>
                      )}
                    </td>
                    <td className="px-md py-sm">
                      {artist.isSuspended ? (
                        <span className="font-mono text-[0.7rem] uppercase text-accent">Suspended</span>
                      ) : (
                        <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Active</span>
                      )}
                    </td>
                    <td className="px-md py-sm">
                      <AdminDeleteButton userId={artist.id} apiPath="/api/admin/artists" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
