import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, conflict, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ gigId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { gigId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ARTIST") {
    return forbidden();
  }

  const gig = await prisma.gig.findUnique({
    where: { id: gigId },
    select: { id: true, status: true },
  });

  if (!gig) {
    return notFound("Gig");
  }

  if (gig.status !== "OPEN") {
    return conflict("This gig is no longer accepting applications");
  }

  const existing = await prisma.gigApplication.findUnique({
    where: { gigId_artistId: { gigId, artistId: user.id } },
    select: { id: true },
  });

  if (existing) {
    return conflict("You have already applied to this gig");
  }

  const schema = z.object({
    message: z.string().trim().max(2000).nullable().optional(),
  });

  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid application");
  }

  try {
    const application = await prisma.gigApplication.create({
      data: {
        gigId,
        artistId: user.id,
        message: parsed.data.message ?? null,
      },
    });
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
