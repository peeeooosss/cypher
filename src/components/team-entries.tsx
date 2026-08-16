import Link from "next/link";
import { formatFee } from "@/lib/format";
import { formatLabel } from "@/lib/event-types";

type TeamEntry = {
  id: string;
  teamName: string | null;
  format: string | null;
  paid: boolean;
  paidClaimedAt: Date | null;
  entryFee: number | null;
  entryCurrency: string | null;
  category: { name: string; event: { title: string } };
  members: Array<{ status: string; user: { name: string | null; username: string | null } }>;
};

export function TeamEntries({ entries }: { entries: TeamEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="mt-section">
      <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">My team entries</p>
      <div className="mt-lg grid gap-md lg:grid-cols-2">
        {entries.map((entry) => {
          const pending = entry.members.some((member) => member.status !== "ACCEPTED");
          return (
            <article className="border border-line bg-paper-soft p-lg" key={entry.id}>
              <div className="flex items-start justify-between gap-md">
                <div>
                  <p className="font-display text-title-md uppercase">{entry.teamName ?? entry.category.name}</p>
                  <p className="mt-xs text-body-sm text-ink-muted">{entry.category.event.title} · {entry.category.name} · {formatLabel(entry.format)}</p>
                </div>
                <span className="font-mono text-[0.65rem] uppercase text-accent">{entry.paid ? "Confirmed" : entry.paidClaimedAt ? "Registered" : "Wait for verification"}</span>
              </div>
              <p className="mt-md border-t border-line pt-md text-body-sm text-ink-muted">{entry.members.map((member) => `${member.user.name ?? member.user.username ?? "Unnamed"} — ${member.status.toLowerCase()}`).join(" · ")}</p>
              {!entry.paid && !entry.paidClaimedAt && !pending ? <Link href={`/cart?ids=${entry.id}`} className="mt-md inline-block border border-accent bg-accent px-md py-sm font-mono text-[0.65rem] font-bold uppercase text-paper">Pay {formatFee(entry.entryFee, entry.entryCurrency ?? "INR")}</Link> : null}
              {pending ? <p className="mt-md font-mono text-[0.65rem] uppercase text-accent">Waiting for all members to accept</p> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
