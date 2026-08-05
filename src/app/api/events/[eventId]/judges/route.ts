import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const judgeSchema = z.object({ judgeId: z.string().cuid() });
type JudgeRouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_: Request, { params }: JudgeRouteContext) {
  const { eventId } = await params;
  const judges = await prisma.event.findUnique({
    where: { id: eventId },
    select: { judges: { select: { id: true, name: true, email: true } } },
  });

  return judges ? NextResponse.json(judges.judges) : notFound("Event");
}

export async function POST(request: Request, { params }: JudgeRouteContext) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  if (!(await getEventForOwner(eventId, user.id))) {
    return notFound("Event");
  }

  const parsed = judgeSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest("A valid judgeId is required");
  }

  const judge = await prisma.user.findFirst({ where: { id: parsed.data.judgeId, role: "JUDGE" }, select: { id: true } });

  if (!judge) {
    return notFound("Judge");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { judges: { connect: { id: judge.id } } },
  });

  return NextResponse.json({ eventId, judgeId: judge.id }, { status: 201 });
}

export async function DELETE(request: Request, { params }: JudgeRouteContext) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER" || !(await getEventForOwner(eventId, user.id))) {
    return forbidden();
  }

  const parsed = judgeSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest("A valid judgeId is required");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { judges: { disconnect: { id: parsed.data.judgeId } } },
  });

  return new NextResponse(null, { status: 204 });
}
