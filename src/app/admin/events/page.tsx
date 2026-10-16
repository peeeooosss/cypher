import Link from "next/link";
import { getAdminEvents, requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  await requireAdmin();
  const events = await getAdminEvents();

  return (
    <div>
      <h2 className="font-display text-title-md uppercase">Events</h2>
      <p className="mt-sm text-body-sm text-ink-muted">
        Open an event to see every category&apos;s artists with phone numbers and download the roster as XLSX.
      </p>
      {events.length === 0 ? (
        <p className="mt-md border border-line p-lg text-ink-muted">No events yet.</p>
      ) : (
        <div className="mt-md overflow-x-auto">
          <table className="w-full border border-line text-body-sm">
            <thead>
              <tr className="border-b border-line bg-paper-soft text-left">
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Event</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Status</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Starts</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Organizer</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Categories</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Entries</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Roster</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-line">
                  <td className="px-md py-sm font-bold uppercase">{event.title}</td>
                  <td className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">{event.status}</td>
                  <td className="px-md py-sm">{new Date(event.startsAt).toLocaleDateString("en-IN")}</td>
                  <td className="px-md py-sm">
                    {event.organizer.studioName ?? event.organizer.name ?? "—"}
                  </td>
                  <td className="px-md py-sm">{event._count.categories}</td>
                  <td className="px-md py-sm">
                    {event.categories.reduce((sum, c) => sum + c._count.registrations, 0)}
                  </td>
                  <td className="px-md py-sm">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="border border-line px-sm py-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] hover:border-accent hover:text-accent"
                    >
                      Open &rarr;
                    </Link>
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
