import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getEventRegistrations, toRosterRows } from "@/lib/registration-roster";

type ExportContext = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, { params }: ExportContext) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });
    if (!event) return notFound("Event");
    if (event.organizerId !== user.id) return forbidden();

    const registrations = await getEventRegistrations(eventId);
    return NextResponse.json({ rows: toRosterRows(registrations) });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
