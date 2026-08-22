import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pending = await prisma.payment.findFirst({
    where: { provider: "PAYU", payerId: user.id, status: "PENDING" },
    select: { id: true },
  });

  if (!pending) return NextResponse.json({ error: "No pending payment to cancel" }, { status: 404 });

  await prisma.payment.updateMany({
    where: { id: pending.id, status: "PENDING" },
    data: { status: "FAILED", providerStatus: "cancelled", metadata: { processingError: "Cancelled by user" } },
  });

  return NextResponse.json({ ok: true });
}
