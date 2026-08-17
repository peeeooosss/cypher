import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const conversation = await prisma.conversation.findFirst({
    where: { id, OR: [{ organizerId: user.id }, { artistId: user.id }] },
    include: {
      gig: { select: { id: true, title: true } },
      organizer: { select: { id: true, name: true } },
      artist: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, senderId: true, body: true, createdAt: true },
      },
    },
  });

  if (!conversation) return notFound("Conversation");

  if (!conversation.unlockedAt) {
    return NextResponse.json(
      { error: "This chat unlocks after the connection fee is paid." },
      { status: 403 },
    );
  }

  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    id: conversation.id,
    gigTitle: conversation.gig?.title ?? null,
    organizerName: conversation.organizer.name ?? "Organizer",
    artistName: conversation.artist.name ?? "Artist",
    messages: conversation.messages,
    myId: user.id,
  });
}

const sendSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const conversation = await prisma.conversation.findFirst({
    where: { id, OR: [{ organizerId: user.id }, { artistId: user.id }] },
    select: { id: true, unlockedAt: true },
  });
  if (!conversation) return forbidden();
  if (!conversation.unlockedAt) {
    return NextResponse.json(
      { error: "This chat unlocks after the connection fee is paid." },
      { status: 403 },
    );
  }

  const parsed = sendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid message");

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: user.id,
      body: parsed.data.body,
    },
    select: { id: true, senderId: true, body: true, createdAt: true },
  });

  await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json(message, { status: 201 });
}
