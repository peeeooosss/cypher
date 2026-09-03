import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const templateSchema = z.object({
  text: z.string().trim().min(1).max(500),
  scoreLabel: z.string().trim().max(100).optional(),
  minScore: z.coerce.number().int().min(0).max(99).default(0),
  maxScore: z.coerce.number().int().min(1).max(100).default(10),
  category: z.string().trim().max(100).optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorized();
    }

    if (user.role !== "ORGANIZER") {
      return forbidden();
    }

    const templates = await prisma.feedbackTemplate.findMany({
      where: { organizerId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorized();
    }

    if (user.role !== "ORGANIZER") {
      return forbidden();
    }

    const parsed = templateSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid template data");
    }

    const template = await prisma.feedbackTemplate.create({
      data: {
        ...parsed.data,
        organizer: { connect: { id: user.id } },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
