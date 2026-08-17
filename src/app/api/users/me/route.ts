import { NextResponse } from "next/server";
import { z } from "zod";
import { Skill } from "@/generated/prisma/enums";
import { badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const nullableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value));

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  upiId: nullableString(120),
  style: nullableString(80),
  crew: nullableString(120),
  city: nullableString(120),
  country: nullableString(120),
  experience: nullableString(50),
  socialHandle: nullableString(120),
  referral: nullableString(200),
  skills: z.array(z.enum(Skill)).max(20).optional(),
  minJudgingPricePerDay: z.number().int().min(0).max(1000000).nullable().optional(),
  minWorkshopPricePerDay: z.number().int().min(0).max(1000000).nullable().optional(),
  isProfilePublic: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const parsed = updateMeSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid data");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      email: true,
      upiId: true,
      style: true,
      crew: true,
      city: true,
      country: true,
      experience: true,
      socialHandle: true,
      referral: true,
      skills: true,
      minJudgingPricePerDay: true,
      minWorkshopPricePerDay: true,
      avatarUrl: true,
      isProfilePublic: true,
    },
  });

  return NextResponse.json(updated);
}
