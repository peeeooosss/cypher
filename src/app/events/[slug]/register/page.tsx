import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArtistIdentityBox } from "@/components/artist-identity-box";
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
        phone: true,
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

  const needsName = !profileUser?.name;
  const needsPhone = !profileUser?.phone;

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
        <div className="mt-lg border border-line bg-cream p-md">
          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
            {event.startsAt && (
              <div>
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
                  When
                </p>
                <p className="mt-xs text-body-sm">
                  {event.startsAt.toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  {event.startsAt.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
            {(event.venue || event.city || event.state) && (
              <div>
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
                  Where
                </p>
                <p className="mt-xs text-body-sm">
                  {[event.venue, event.city, event.state].filter(Boolean).join(", ")}
                </p>
              </div>
            )}
            {event.lastRegistrationAt && (
              <div>
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
                  Registration deadline
                </p>
                <p className="mt-xs text-body-sm">
                  {event.lastRegistrationAt.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
            {event.contactDetails && (
              <div>
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
                  Contact
                </p>
                <p className="mt-xs whitespace-pre-line text-body-sm">{event.contactDetails}</p>
              </div>
            )}
          </div>
          {(event.eventDetails || event.registrationInstructions) && (
            <div className="mt-sm border-t border-line pt-sm">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
                Before you sign up
              </p>
              <p className="mt-xs whitespace-pre-line text-body-sm">
                {event.registrationInstructions || event.eventDetails}
              </p>
            </div>
          )}
        </div>
        {!isOpen ? (
          <div className="mt-section border border-line p-lg">
            <p className="font-display text-title-md uppercase text-ink-muted">
              Registration closed
            </p>
            <p className="mt-sm text-body-sm text-ink-muted">
              Registrations are not open for this event right now.
            </p>
          </div>
        ) : needsName || needsPhone ? (
          <ArtistIdentityBox needsName={needsName} needsPhone={needsPhone} />
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
