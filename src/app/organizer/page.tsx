import { CategoryForm, EventForm } from "@/components/event-form";
import { SignOutButton } from "@/components/sign-out-button";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrganizerPage() {
  const user = await requireRole("ORGANIZER");
  const events = await prisma.event.findMany({
    where: { organizerId: user.id },
    include: {
      categories: { include: { _count: { select: { registrations: true } } } },
    },
    orderBy: { startsAt: "asc" },
  });

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Organizer console</p>
      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="font-display text-display-lg uppercase">Build the next floor.</h1>
          <p className="mt-sm text-body-sm text-ink-muted">Signed in as {user.email}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-section">
        <EventForm />
      </div>

      <section className="mt-section">
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">Your events</p>
        <div className="mt-lg grid gap-md lg:grid-cols-2">
          {events.length === 0 ? <p className="border border-line p-lg text-ink-muted">No events yet.</p> : null}
          {events.map((event) => (
            <article className="border border-line p-lg" key={event.id}>
              <div className="flex items-start justify-between gap-md">
                <div>
                  <h2 className="font-display text-title-md uppercase">{event.title}</h2>
                  <p className="mt-xs text-body-sm text-ink-muted">{event.startsAt.toLocaleString()} / {event.status}</p>
                </div>
                <span className="font-mono text-[0.65rem] text-accent">{event.slug}</span>
              </div>
              <div className="mt-lg border-t border-line pt-md">
                <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Categories</p>
                <ul className="mt-sm space-y-xs text-body-sm">
                  {event.categories.map((category) => (
                    <li className="flex justify-between" key={category.id}>
                      <span>{category.name}</span>
                      <span className="text-ink-muted">{category._count.registrations} registered</span>
                    </li>
                  ))}
                </ul>
                <CategoryForm eventId={event.id} />
              </div>
              <a className="mt-md block border border-accent px-md py-sm text-center text-body-sm font-bold uppercase text-accent hover:bg-accent hover:text-paper" href={`/organizer/${event.id}`}>
                Manage event
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
