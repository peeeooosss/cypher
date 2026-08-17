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
      unlockedAt: { not: null },
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

  const payload = conversations.map((c) => ({
    id: c.id,
    gigTitle: c.gig?.title ?? null,
    organizerName: c.organizer.name ?? "Organizer",
    artistName: c.artist.name ?? "Artist",
    otherParty: user.id === c.organizerId ? (c.artist.name ?? "Artist") : (c.organizer.name ?? "Organizer"),
    lastMessage: c.messages[0] ?? null,
  }));

  return NextResponse.json(payload);
}
