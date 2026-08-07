import { NextResponse } from "next/server";
import { forbidden, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { getAdminStats } from "@/lib/admin";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ADMIN") {
    return forbidden();
  }

  try {
    return NextResponse.json(await getAdminStats());
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
