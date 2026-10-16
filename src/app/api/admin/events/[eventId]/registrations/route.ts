import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getAdminEventRoster } from "@/lib/admin";

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ADMIN") return forbidden();

    const roster = await getAdminEventRoster(eventId);
    if (!roster) return notFound("Event");

    return NextResponse.json(roster);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
