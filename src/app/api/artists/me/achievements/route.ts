import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const achievementSchema = z.object({
  title: z.string().trim().min(2).max(120),
  competition: z.string().trim().max(200).nullable().optional(),
  placement: z.string().trim().max(120).nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  prize: z.number().int().min(0).max(1000000000).nullable().optional(),
  currency: z.string().trim().min(1).max(8).default("INR"),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ARTIST") {
    return forbidden();
  }

  const parsed = achievementSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid achievement data");
  }

  try {
    const achievement = await prisma.artistAchievement.create({
      data: { ...parsed.data, userId: user.id },
    });
    return NextResponse.json(achievement, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
