import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { deleteUploadThingFile } from "@/lib/uploadthing-server";
import { isUploadThingUrl } from "@/lib/uploadthing-url";

export const runtime = "nodejs";

const logoSchema = z.object({
  studioLogoUrl: z.string().url().refine(isUploadThingUrl, "Invalid UploadThing URL"),
  studioLogoFileKey: z.string().trim().min(1).max(255),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  if (!process.env.UPLOADTHING_TOKEN) {
    return NextResponse.json(
      { error: "Image storage is not configured. Contact support." },
      { status: 500 },
    );
  }

  const parsed = logoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid uploaded logo");

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { studioLogoFileKey: true },
  });

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        studioLogoUrl: parsed.data.studioLogoUrl,
        studioLogoFileKey: parsed.data.studioLogoFileKey,
      },
      select: { studioLogoUrl: true },
    });

    if (existing?.studioLogoFileKey && existing.studioLogoFileKey !== parsed.data.studioLogoFileKey) {
      await deleteUploadThingFile(existing.studioLogoFileKey);
    }

    return NextResponse.json({ studioLogoUrl: updated.studioLogoUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { studioLogoFileKey: true },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { studioLogoUrl: null, studioLogoFileKey: null },
  });
  await deleteUploadThingFile(me?.studioLogoFileKey);

  return NextResponse.json({ studioLogoUrl: null });
}
