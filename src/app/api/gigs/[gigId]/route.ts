import { NextResponse } from "next/server";
import { z } from "zod";
import { GigStatus } from "@/generated/prisma/enums";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ gigId: string }> };

export async function GET(_: Request, { params }: Context) {
  const { gigId } = await params;
  const user = await getCurrentUser();

  const gig = await prisma.gig.findUnique({
    where: { id: gigId },
    include: {
      organizer: { select: { id: true, name: true } },
      applications: {
        include: {
          artist: {
            select: {
              id: true,
              name: true,
              style: true,
              crew: true,
              city: true,
              experience: true,
              socialHandle: true,
              skills: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!gig) {
    return notFound("Gig");
  }

  if (user && user.id === gig.organizerId && user.role === "ORGANIZER") {
    return NextResponse.json(gig);
  }

  if (user && user.role === "ARTIST") {
    const application = await prisma.gigApplication.findUnique({
      where: { gigId_artistId: { gigId, artistId: user.id } },
      select: { id: true, status: true, message: true },
    });
    return NextResponse.json({ ...gig, applications: undefined, myApplication: application });
  }

  return NextResponse.json({ ...gig, applications: undefined });
}

export async function PATCH(request: Request, { params }: Context) {
  const { gigId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const owned = await prisma.gig.findFirst({
    where: { id: gigId, organizerId: user.id },
    select: { id: true },
  });

  if (!owned) {
    return notFound("Gig");
  }

  const schema = z.object({
    status: z.enum(GigStatus).optional(),
    title: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().min(2).max(5000).optional(),
    budget: z.number().int().min(0).max(100000000).nullable().optional(),
  });

  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid gig data");
  }

  try {
    const gig = await prisma.gig.update({ where: { id: gigId }, data: parsed.data });
    return NextResponse.json(gig);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
