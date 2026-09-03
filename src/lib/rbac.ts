import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";
import { authOptions } from "@/lib/auth";

export async function getCurrentUser() {
  return (await getServerSession(authOptions))?.user ?? null;
}

export async function requireRole(...allowedRoles: UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect("/");
  }

  return user;
}
