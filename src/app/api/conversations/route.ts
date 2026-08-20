import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ organizerId: user.id }, { artistId: user.id }],
    },
    include: {
      gig: { select: { id: true, title: true } },
      organizer: { select: { id: true, name: true } },
      artist: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const applicationIds = conversations
    .map((c) => c.applicationId)
    .filter((id): id is string => id != null);

  const agreements = await prisma.gigAgreement.findMany({
    where: { applicationId: { in: applicationIds.length > 0 ? applicationIds : ["__none__"] } },
    select: { applicationId: true, id: true, status: true, connectionPaymentStatus: true },
  });

  const agreementByAppId = new Map(agreements.map((a) => [a.applicationId, a]));

  const payload = conversations.map((c) => {
    const agreement = c.applicationId ? agreementByAppId.get(c.applicationId) : undefined;
    return {
      id: c.id,
      gigTitle: c.gig?.title ?? null,
      organizerName: c.organizer.name ?? "Organizer",
      artistName: c.artist.name ?? "Artist",
      otherParty: user.id === c.organizerId ? (c.artist.name ?? "Artist") : (c.organizer.name ?? "Organizer"),
      lastMessage: c.messages[0] ?? null,
      unlocked: c.unlockedAt !== null,
      agreementId: agreement?.id ?? null,
    };
  });

  return NextResponse.json(payload);
}
