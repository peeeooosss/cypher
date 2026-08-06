import { NextResponse } from "next/server";
import { z } from "zod";
import { GigApplicationStatus } from "@/generated/prisma/enums";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ gigId: string; applicationId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { gigId, applicationId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const gig = await prisma.gig.findFirst({
    where: { id: gigId, organizerId: user.id },
    select: { id: true },
  });

  if (!gig) {
    return notFound("Gig");
  }

  const schema = z.object({
    status: z.enum(GigApplicationStatus).refine((s) => s === "ACCEPTED" || s === "REJECTED", {
      message: "Only ACCEPTED or REJECTED are allowed",
    }),
  });

  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid status");
  }

  try {
    const application = await prisma.gigApplication.update({
      where: { id: applicationId },
      data: { status: parsed.data.status },
    });
    return NextResponse.json(application);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
