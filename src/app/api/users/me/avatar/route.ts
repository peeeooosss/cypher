import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Image storage is not configured. Contact support." },
      { status: 500 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return badRequest("No file provided");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return badRequest("Only JPG, PNG, or WebP images are allowed");
  }

  if (file.size > MAX_FILE_BYTES) {
    return badRequest("Image is too large. Keep it under 5MB");
  }

  if (file.size === 0) {
    return badRequest("Image is empty");
  }

  const extension =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";

  try {
    const blob = await put(`avatars/${user.id}/${Date.now()}.${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: blob.url },
      select: { avatarUrl: true },
    });

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
    select: { avatarUrl: true },
  });

  if (me?.avatarUrl && me.avatarUrl.startsWith("https://") && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(me.avatarUrl);
    } catch (error) {
      console.error(error);
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ avatarUrl: null });
}
