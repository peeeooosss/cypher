import { NextResponse } from "next/server";
import { z } from "zod";
import { GigStatus, Skill } from "@/generated/prisma/enums";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const gigSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(5000),
  skillsRequired: z.array(z.enum(Skill)).min(1).max(20),
  location: z.string().trim().max(200).optional(),
  budget: z.number().int().min(0).max(100000000).optional(),
  currency: z.string().trim().min(1).max(8).default("INR"),
  startsAt: z.coerce.date().optional(),
  status: z.enum(GigStatus).default(GigStatus.OPEN),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizerId = searchParams.get("organizerId");
  const skillsParam = searchParams.get("skills");
  const skills = skillsParam
    ? skillsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const where: Record<string, unknown> = organizerId
    ? { organizerId }
    : { status: GigStatus.OPEN, feePaid: true };

  if (skills.length > 0) {
    where.skillsRequired = { hasSome: skills };
  }

  const gigs = await prisma.gig.findMany({
    where,
    include: {
      organizer: { select: { id: true, name: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(gigs);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const parsed = gigSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid gig data");
  }

  try {
    const gig = await prisma.gig.create({
      data: { ...parsed.data, organizer: { connect: { id: user.id } } },
      include: { organizer: { select: { name: true } } },
    });
    return NextResponse.json(gig, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
