import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { MarketplaceDashboard } from "@/components/marketplace-dashboard";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/payment";

export const dynamic = "force-dynamic";

export default async function ArtistMarketplacePage() {
  const user = await requireRole("ARTIST");

  const [gigs, applications, me, unreadMessages] = await Promise.all([
    prisma.gig.findMany({
      where: { status: "OPEN" },
      select: {
        id: true,
        title: true,
        description: true,
        skillsRequired: true,
        location: true,
        budget: true,
        currency: true,
        startsAt: true,
        status: true,
        organizer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.gigApplication.findMany({
      where: { artistId: user.id },
      select: {
        id: true,
        status: true,
        message: true,
        createdAt: true,
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
        agreement: {
          select: {
            id: true,
            status: true,
            offerAmount: true,
            currency: true,
            scope: true,
            deliverables: true,
            workDate: true,
            location: true,
            cancellationTerms: true,
            paymentTerms: true,
            organizerSignedAt: true,
            artistSignedAt: true,
            connectionPaidAt: true,
            connectionPaymentStatus: true,
            connectionPaymentSentAt: true,
            workCompletedAt: true,
            paymentStatus: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        username: true,
        gigWorkEnabledAt: true,
        gigWorkExpiresAt: true,
        gigWorkPaymentStatus: true,
        gigWorkPaidAt: true,
      },
    }),
    prisma.message.count({
      where: {
        conversation: { artistId: user.id },
        senderId: { not: user.id },
        readAt: null,
      },
    }),
  ]);

  const sender = displayName(me?.name, me?.username) || undefined;
  const gigWorkExpiresAt = me?.gigWorkExpiresAt?.toISOString() ?? null;
  const gigWorkEnabledAt = me?.gigWorkEnabledAt?.toISOString() ?? null;
  const gigWorkPaidAt = me?.gigWorkPaidAt?.toISOString() ?? null;

  const serializedGigs = gigs.map((g) => ({
    ...g,
    startsAt: g.startsAt ? new Date(g.startsAt).toISOString() : null,
  }));

  const serializedApplications = applications.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    gig: {
      ...a.gig,
      startsAt: a.gig.startsAt ? new Date(a.gig.startsAt).toISOString() : null,
    },
    agreement: a.agreement
      ? {
          ...a.agreement,
          workDate: a.agreement.workDate ? a.agreement.workDate.toISOString() : null,
          organizerSignedAt: a.agreement.organizerSignedAt
            ? a.agreement.organizerSignedAt.toISOString()
            : null,
          artistSignedAt: a.agreement.artistSignedAt
            ? a.agreement.artistSignedAt.toISOString()
            : null,
          connectionPaidAt: a.agreement.connectionPaidAt
            ? a.agreement.connectionPaidAt.toISOString()
            : null,
          connectionPaymentSentAt: a.agreement.connectionPaymentSentAt
            ? a.agreement.connectionPaymentSentAt.toISOString()
            : null,
          workCompletedAt: a.agreement.workCompletedAt
            ? a.agreement.workCompletedAt.toISOString()
            : null,
          createdAt: a.agreement.createdAt.toISOString(),
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
        gigs={serializedGigs}
        applications={serializedApplications}
        gigWorkEnabled={gigWorkEnabledAt != null && gigWorkPaidAt != null}
        gigWorkStatus={me?.gigWorkPaymentStatus ?? "NONE"}
        gigWorkExpiresAt={gigWorkExpiresAt}
        unreadMessages={unreadMessages}
        sender={sender}
      />
    </main>
  );
}