import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { emitToSocket } from "@/lib/socket-emit";

const cypherAdvanceSchema = z.object({ registrationIds: z.array(z.string().min(1)) });

type Context = { params: Promise<{ categoryId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { categoryId } = await params;
  const user = await getCurrentUser();

  if (!user) return unauthorized();
  if (user.role !== "ORGANIZER") return forbidden();

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { event: { select: { organizerId: true } }, rounds: { orderBy: { order: "asc" } }, registrations: { where: { status: "CONFIRMED" }, include: { members: { where: { status: "ACCEPTED" }, select: { id: true } } } } },
  });

  if (!category) return notFound("Category");
  if (category.event.organizerId !== user.id) return forbidden();

  const currentPhase = category.rounds.find((r) => r.order === category.currentPhaseOrder && r.phaseStatus === "ACTIVE");
  if (!currentPhase) return badRequest("No active cypher phase");
  if (!["CYPHER", "QUALIFIER"].includes(currentPhase.type)) return badRequest("Current phase is not a cypher");

  const parsed = cypherAdvanceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Provide a list of registrationIds to advance");

  const { registrationIds } = parsed.data;

  const registrations = category.registrations;

  if (registrations.some((registration) => registration.members.length < category.minMembers || registration.members.length > category.maxMembers)) {
    return badRequest("Every entry must have a complete accepted roster before advancing");
  }

  const confirmedIds = new Set(registrations.map((r) => r.id));
  const advancedIds = new Set(registrationIds);
  const toWithdraw = registrations.filter((r) => !advancedIds.has(r.id));

  for (const invalidId of registrationIds) {
    if (!confirmedIds.has(invalidId)) return badRequest(`Registration ${invalidId} is not confirmed`);
  }

  await prisma.$transaction(
    toWithdraw.map((r) => prisma.registration.update({ where: { id: r.id }, data: { status: "WITHDRAWN" } }))
  );

  // Emit socket events for real-time updates
  await emitToSocket(category.eventId, "registration:withdrawn", {
    registrationIds: toWithdraw.map((r) => r.id),
    categoryId,
  });
  await emitToSocket(category.eventId, "leaderboard:update", { categoryId });

  return NextResponse.json({ advanced: registrationIds.length, withdrawn: toWithdraw.length });
}
