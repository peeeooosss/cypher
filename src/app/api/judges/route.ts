import { NextResponse } from "next/server";
import { forbidden, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const judges = await prisma.user.findMany({
    where: { role: "JUDGE" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(judges);
}
