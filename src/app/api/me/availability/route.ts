import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  note: z.string().trim().max(200).optional(),
}).refine((d) => d.dateTo >= d.dateFrom, { message: "End date must be on or after start date" });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ARTIST") return forbidden();

  const availability = await prisma.artistAvailability.findMany({
    where: { userId: user.id },
    orderBy: { dateFrom: "asc" },
  });

  return NextResponse.json(availability);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ARTIST") return forbidden();

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid availability");

  try {
    const record = await prisma.artistAvailability.create({
      data: {
        userId: user.id,
        dateFrom: parsed.data.dateFrom,
        dateTo: parsed.data.dateTo,
        note: parsed.data.note ?? null,
      },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
