import { RegistrationButton } from "@/components/registration-button";
import { SignOutButton } from "@/components/sign-out-button";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function ArtistPage() {
  const user = await requireRole("ARTIST");
  const [events, registrations] = await Promise.all([
    prisma.event.findMany({
      where: { status: { in: ["PUBLISHED", "LIVE"] } },
      include: { categories: { include: { _count: { select: { registrations: true } } } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.registration.findMany({ where: { userId: user.id }, select: { categoryId: true } }),
  ]);
  const registeredCategoryIds = new Set(registrations.map((registration) => registration.categoryId));

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Artist space</p>
      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="font-display text-display-lg uppercase">Find your next battle.</h1>
          <p className="mt-sm text-body-sm text-ink-muted">Signed in as {user.email}</p>
        </div>
        <SignOutButton />
      </div>

      <section className="mt-section grid gap-md lg:grid-cols-2">
        {events.length === 0 ? <p className="border border-line p-lg text-ink-muted">No open events right now.</p> : null}
        {events.map((event) => (
          <article className="border border-line bg-paper-soft p-lg" key={event.id}>
            <p className="font-mono text-[0.7rem] uppercase text-accent">{event.status}</p>
            <h2 className="mt-sm font-display text-title-md uppercase">{event.title}</h2>
            <p className="mt-xs text-body-sm text-ink-muted">{event.startsAt.toLocaleString()} / {event.city ?? "Location TBA"}</p>
            <ul className="mt-lg space-y-sm border-t border-line pt-md">
              {event.categories.map((category) => (
                <li className="flex items-center justify-between gap-md" key={category.id}>
                  <span className="text-body-sm">{category.name} <span className="text-ink-muted">({category._count.registrations})</span></span>
                  <RegistrationButton categoryId={category.id} registered={registeredCategoryIds.has(category.id)} />
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
