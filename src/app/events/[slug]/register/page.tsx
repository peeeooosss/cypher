import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { RegistrationForm } from "@/components/registration-form";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { EventStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const REQUIRED_PROFILE_FIELDS = ["style", "city", "country", "experience", "socialHandle"] as const;

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

  const [existing, profileUser] = await Promise.all([
    prisma.registration.findMany({
      where: {
        categoryId: { in: event.categories.map((c) => c.id) },
        OR: [
          { userId: user.id },
          { members: { some: { userId: user.id, status: { in: ["PENDING", "ACCEPTED"] } } } },
        ],
      },
      select: { id: true, categoryId: true, userId: true, paid: true, paidClaimedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        username: true,
        style: true,
        city: true,
        country: true,
        experience: true,
        socialHandle: true,
      },
    }),
  ]);
  const registeredCategoryIds = new Set(existing.map((r) => r.categoryId));
  const paidCategoryIds = new Set(existing.filter((r) => r.paid).map((r) => r.categoryId));
  const claimedCategoryIds = new Set(
    existing.filter((r) => r.paidClaimedAt != null).map((r) => r.categoryId),
  );
  const pendingRegistrationIds: Record<string, string> = {};
  for (const registration of existing) {
    if (!registration.paid && registration.userId === user.id) {
      pendingRegistrationIds[registration.categoryId] = registration.id;
    }
  }

  const profileComplete = REQUIRED_PROFILE_FIELDS.every((field) =>
    Boolean(profileUser?.[field]),
  );

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
          Pick the categories you want to enter, then pay the organizer to confirm your spot.
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
        ) : !profileComplete ? (
          <div className="mt-section border border-line p-lg">
            <p className="font-display text-title-md uppercase text-accent">
              Complete your battle profile
            </p>
            <p className="mt-sm text-body-sm text-ink-muted">
              Add your style, city, country, experience and social handle before you register.
              Organizers see these details on your entry.
            </p>
            <Link
              href="/artist"
              className="mt-lg inline-block border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper hover:opacity-80"
            >
              Update profile
            </Link>
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
              format: category.format,
              minMembers: category.minMembers,
              maxMembers: category.maxMembers,
            }))}
            registeredCategoryIds={registeredCategoryIds}
            paidCategoryIds={paidCategoryIds}
            claimedCategoryIds={claimedCategoryIds}
            pendingRegistrationIds={pendingRegistrationIds}
            currentUser={{
              name: profileUser?.name ?? null,
              username: profileUser?.username ?? null,
            }}
          />
        )}
      </div>
    </main>
  );
}
