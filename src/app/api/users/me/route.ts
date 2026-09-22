import { NextResponse } from "next/server";
import { z } from "zod";
import { Skill } from "@/generated/prisma/enums";
import { badRequest, conflict, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

const nullableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value));

const socialLinksSchema = z.object({
  instagram: z.string().url().nullable().optional(),
  youtube: z.string().url().nullable().optional(),
  soundcloud: z.string().url().nullable().optional(),
  twitter: z.string().url().nullable().optional(),
}).optional();

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().optional(),
  upiId: nullableString(120),
  whatsappNumber: nullableString(20),
  style: nullableString(80),
  crew: nullableString(120),
  city: nullableString(120),
  country: nullableString(120),
  experience: nullableString(50),
  socialHandle: nullableString(120),
  keywords: nullableString(500),
  referral: nullableString(200),
  skills: z.array(z.enum(Skill)).max(20).optional(),
  minJudgingPricePerDay: z.number().int().min(0).max(1000000).nullable().optional(),
  minWorkshopPricePerDay: z.number().int().min(0).max(1000000).nullable().optional(),
  isProfilePublic: z.boolean().optional(),
  bio: nullableString(5000),
  hourlyRate: z.number().int().min(0).max(1000000).nullable().optional(),
  responseTime: nullableString(100),
  socialLinks: socialLinksSchema,
});

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorized();
    }

    const parsed = updateMeSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const data = { ...parsed.data };
    if (data.phone !== undefined) {
      const normalized = normalizePhone(data.phone);
      if (!normalized) {
        return badRequest("Enter a valid 10-digit mobile number.");
      }
      const sameRole = await prisma.user.count({
        where: { phone: normalized, role: user.role, NOT: { id: user.id } },
      });
      if (sameRole > 0) {
        return conflict(`That phone number is already used by another ${user.role === "ARTIST" ? "Artist" : "Organizer"}`);
      }
      data.phone = normalized;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        upiId: true,
        whatsappNumber: true,
        style: true,
        crew: true,
        city: true,
        country: true,
        experience: true,
        socialHandle: true,
        keywords: true,
        referral: true,
        skills: true,
        minJudgingPricePerDay: true,
        minWorkshopPricePerDay: true,
        avatarUrl: true,
        isProfilePublic: true,
        bio: true,
        coverUrl: true,
        hourlyRate: true,
        responseTime: true,
        socialLinks: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
