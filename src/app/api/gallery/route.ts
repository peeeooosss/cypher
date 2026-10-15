import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  featured: z.enum(["1", "true"]).optional(),
  type: z.enum(["PHOTO", "VIDEO"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const parsed = querySchema.safeParse({
      featured: searchParams.get("featured") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return badRequest("Invalid gallery filters");

    const items = await prisma.galleryItem.findMany({
      where: {
        isPublished: true,
        ...(parsed.data.featured ? { isFeaturedHomepage: true } : {}),
        ...(parsed.data.type ? { type: parsed.data.type } : {}),
      },
      include: {
        event: { select: { id: true, title: true, slug: true } },
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      take: parsed.data.limit ?? 60,
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
