import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api";
import { BracketError, completeMatch } from "@/lib/bracket";
import { getCurrentUser } from "@/lib/rbac";

const completeSchema = z.object({ winnerId: z.string().cuid() });
type MatchRouteContext = { params: Promise<{ matchId: string }> };

export async function POST(request: Request, { params }: MatchRouteContext) {
  const { matchId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const parsed = completeSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest("A valid winnerId is required");
  }

  try {
    return NextResponse.json(await completeMatch(matchId, parsed.data.winnerId, user.id));
  } catch (error) {
    if (error instanceof BracketError) {
      return notFound(error.message);
    }

    console.error(error);
    return NextResponse.json({ error: "Unable to complete match" }, { status: 500 });
  }
}
