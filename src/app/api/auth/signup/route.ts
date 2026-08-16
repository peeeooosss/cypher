import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums";
import { badRequest, conflict, isUniqueConstraintError, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const ARTIST_PROFILE_FIELDS = ["city", "country", "experience", "socialHandle"] as const;

const signupSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, "Username must use 3–30 letters, numbers, or underscores").optional(),
    role: z.enum([UserRole.ORGANIZER, UserRole.ARTIST]),
    style: z.string().trim().max(80).optional(),
    crew: z.string().trim().max(120).optional(),
    city: z.string().trim().min(1, "City is required").max(120).optional(),
    country: z.string().trim().min(1, "Country is required").max(120).optional(),
    experience: z.string().trim().min(1, "Experience is required").max(50).optional(),
    socialHandle: z.string().trim().min(1, "Social handle is required").max(120).optional(),
    referral: z.string().trim().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== UserRole.ARTIST) return;

    for (const field of ARTIST_PROFILE_FIELDS) {
      if (!data[field]) {
        ctx.addIssue({ code: "custom", message: `${field} is required for artists`, path: [field] });
      }
    }
  });

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid signup data");
  }

   const { email, password, name, role, username, ...profile } = parsed.data;

  try {
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        username: username ?? null,
        passwordHash: await hash(password, 12),
        role,
        style: profile.style ?? null,
        crew: profile.crew ?? null,
        city: profile.city ?? null,
        country: profile.country ?? null,
        experience: profile.experience ?? null,
        socialHandle: profile.socialHandle ?? null,
        referral: profile.referral ?? null,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
     if (isUniqueConstraintError(error)) {
       return conflict("That email or username is already in use");
    }

    console.error(error);
    return serverError();
  }
}
