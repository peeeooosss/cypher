import { JudgePortal } from "@/components/judge-portal";
import { SignOutButton } from "@/components/sign-out-button";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function JudgePage() {
  const user = await requireRole("JUDGE");
  const events = await prisma.event.findMany({
    where: { judges: { some: { id: user.id } } },
    select: { id: true, title: true, status: true },
    orderBy: { startsAt: "asc" },
  });

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Judge portal</p>
      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="font-display text-display-lg uppercase">Keep the score honest.</h1>
          <p className="mt-sm text-body-sm text-ink-muted">Signed in as {user.email}</p>
        </div>
        <SignOutButton />
      </div>
      <JudgePortal events={events} />
    </main>
  );
}
