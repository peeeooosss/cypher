import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { MarketplaceDashboard } from "@/components/marketplace-dashboard";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ArtistMarketplacePage() {
  const user = await requireRole("ARTIST");

  const [gigs, applications, me, unreadMessages] = await Promise.all([
    prisma.gig.findMany({
      where: { status: "OPEN", feePaid: true },
      include: { organizer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.gigApplication.findMany({
      where: { artistId: user.id },
      include: {
        gig: {
          select: {
            id: true,
            title: true,
            description: true,
            budget: true,
            currency: true,
            location: true,
            startsAt: true,
            status: true,
            skillsRequired: true,
          },
        },
        agreement: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { gigWorkExpiresAt: true, gigWorkPaymentStatus: true },
    }),
    prisma.message.count({
      where: {
        conversation: { artistId: user.id },
        senderId: { not: user.id },
        readAt: null,
      },
    }),
  ]);

  const now = new Date();
  const gigWorkEnabled =
    me?.gigWorkExpiresAt != null && me.gigWorkExpiresAt.getTime() > now.getTime();
  const gigWorkStatus = (me?.gigWorkPaymentStatus ?? "NONE") as "NONE" | "PENDING" | "VERIFIED";

  const gigViews = gigs.map((gig) => ({
    id: gig.id,
    title: gig.title,
    description: gig.description,
    skillsRequired: gig.skillsRequired,
    location: gig.location,
    budget: gig.budget,
    currency: gig.currency,
    startsAt: gig.startsAt?.toISOString() ?? null,
    status: gig.status,
    organizer: { name: gig.organizer.name },
  }));

  const applicationViews = applications.map((app) => ({
    id: app.id,
    status: app.status,
    message: app.message,
    createdAt: app.createdAt.toISOString(),
    gig: {
      id: app.gig.id,
      title: app.gig.title,
      description: app.gig.description,
      budget: app.gig.budget,
      currency: app.gig.currency,
      location: app.gig.location,
      startsAt: app.gig.startsAt?.toISOString() ?? null,
      status: app.gig.status,
      skillsRequired: app.gig.skillsRequired,
    },
    agreement: app.agreement
      ? {
          id: app.agreement.id,
          status: app.agreement.status,
          offerAmount: app.agreement.offerAmount,
          currency: app.agreement.currency,
          scope: app.agreement.scope,
          deliverables: app.agreement.deliverables,
          workDate: app.agreement.workDate?.toISOString() ?? null,
          location: app.agreement.location,
          cancellationTerms: app.agreement.cancellationTerms,
          paymentTerms: app.agreement.paymentTerms,
          organizerSignedAt: app.agreement.organizerSignedAt?.toISOString() ?? null,
          artistSignedAt: app.agreement.artistSignedAt?.toISOString() ?? null,
          connectionPaidAt: app.agreement.connectionPaidAt?.toISOString() ?? null,
          connectionPaymentStatus: app.agreement.connectionPaymentStatus,
          connectionPaymentSentAt: app.agreement.connectionPaymentSentAt?.toISOString() ?? null,
          workCompletedAt: app.agreement.workCompletedAt?.toISOString() ?? null,
          paymentStatus: app.agreement.paymentStatus,
          createdAt: app.agreement.createdAt.toISOString(),
        }
      : null,
  }));

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <Link
        href="/artist"
        className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
      >
        &larr; Back to dashboard
      </Link>
      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
            Marketplace
          </p>
          <h1 className="font-display text-display-lg uppercase">Find your next gig.</h1>
          <p className="mt-sm text-body-sm text-ink-muted">
            Browse freelance work, send proposals, manage offers and chat with organizers.
          </p>
        </div>
        <SignOutButton />
      </div>

      <MarketplaceDashboard
        gigs={gigViews}
        applications={applicationViews}
        gigWorkEnabled={gigWorkEnabled}
        gigWorkStatus={gigWorkStatus}
        unreadMessages={unreadMessages}
      />
    </main>
  );
}
