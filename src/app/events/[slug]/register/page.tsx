import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { RegistrationForm } from "@/components/registration-form";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { EventStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

type RegisterPageContext = { params: Promise<{ slug: string }> };

export default async function RegisterPage({ params }: RegisterPageContext) {
  const { slug } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/events/${slug}/register`)}`);
  }

  if (user.role !== "ARTIST") {
    redirect("/");
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      categories: {
        include: { _count: { select: { registrations: true } } },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const isOpen = event.status === EventStatus.PUBLISHED || event.status === EventStatus.LIVE;

  const existing = await prisma.registration.findMany({
    where: { userId: user.id, categoryId: { in: event.categories.map((c) => c.id) } },
    select: { categoryId: true, paid: true },
  });
  const registeredCategoryIds = new Set(existing.map((r) => r.categoryId));
  const paidCategoryIds = new Set(existing.filter((r) => r.paid).map((r) => r.categoryId));

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-4xl px-md py-section md:px-xl">
        <Link
          href={`/events/${event.slug}`}
          className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
        >
          &larr; Back to event
        </Link>
        <p className="mt-lg font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
          Register
        </p>
        <h1 className="mt-sm font-display text-display-xl uppercase leading-tight tracking-[-0.03em]">
          {event.title}
        </h1>
        <p className="mt-md text-body-sm text-ink-muted">
          Pick the categories you want to enter, add your details, then pay the organizer to confirm your spot.
        </p>

        {!isOpen ? (
          <div className="mt-section border border-line p-lg">
            <p className="font-display text-title-md uppercase text-ink-muted">
              Registration closed
            </p>
            <p className="mt-sm text-body-sm text-ink-muted">
              Registrations are not open for this event right now.
            </p>
          </div>
        ) : (
          <RegistrationForm
            eventId={event.id}
            categories={event.categories.map((category) => ({
              id: category.id,
              name: category.name,
              entryFee: category.entryFee,
              entryCurrency: category.entryCurrency,
              maxCompetitors: category.maxCompetitors,
              registeredCount: category._count.registrations,
            }))}
            registeredCategoryIds={registeredCategoryIds}
            paidCategoryIds={paidCategoryIds}
          />
        )}
      </div>
    </main>
  );
}
