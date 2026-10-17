import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, serverError } from "@/lib/api";
import type { Prisma } from "@/generated/prisma/client";

type Context = { params: Promise<{ id: string }> };

const criterionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  max: z.number().min(0),
  order: z.number().min(1),
});

const configSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  appliesTo: z.enum(["EVENT_TYPE", "ROUND_TYPE", "EVENT", "CATEGORY", "ROUND_FORMAT"]),
  appliesToValue: z.string().nullable().optional(),
  criteria: z.array(criterionSchema).min(1),
  totalMax: z.number().min(1),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_: Request, { params }: Context) {
  try {
    await requireAdmin();
    const { id } = await params;
    const config = await prisma.scoringConfig.findUnique({ where: { id } });
    if (!config) return notFound("Config not found");
    return NextResponse.json(config);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsed = configSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid data");
    }
    const data = parsed.data;
    const config = await prisma.scoringConfig.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        appliesTo: data.appliesTo,
        appliesToValue: data.appliesToValue,
        criteria: data.criteria as unknown as Prisma.InputJsonValue,
        totalMax: data.totalMax,
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
      },
    });
    return NextResponse.json(config);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
