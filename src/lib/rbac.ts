import { getServerSession } from "next-auth";
import type { UserRole } from "@/generated/prisma/enums";
import { authOptions } from "@/lib/auth";

export async function getCurrentUser() {
  return (await getServerSession(authOptions))?.user ?? null;
}

export async function requireRole(...allowedRoles: UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
