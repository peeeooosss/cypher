import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { deleteUploadThingFile } from "@/lib/uploadthing-server";
import { isUploadThingUrl } from "@/lib/uploadthing-url";

export const runtime = "nodejs";

const avatarSchema = z.object({
  avatarUrl: z.string().url().refine(isUploadThingUrl, "Invalid UploadThing URL"),
  avatarFileKey: z.string().trim().min(1).max(255),
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

  const parsed = avatarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid uploaded image");

  try {
    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarFileKey: true },
    });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: parsed.data.avatarUrl,
        avatarFileKey: parsed.data.avatarFileKey,
      },
      select: { avatarUrl: true },
    });

    if (existing?.avatarFileKey && existing.avatarFileKey !== parsed.data.avatarFileKey) {
      await deleteUploadThingFile(existing.avatarFileKey);
    }

    return NextResponse.json({ avatarUrl: updated.avatarUrl });
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
    select: { avatarFileKey: true },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null, avatarFileKey: null },
  });
  await deleteUploadThingFile(me?.avatarFileKey);

  return NextResponse.json({ avatarUrl: null });
}
