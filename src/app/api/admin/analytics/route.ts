import { NextResponse } from "next/server";
import { forbidden, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { getAdminAnalytics } from "@/lib/admin";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ADMIN") {
    return forbidden();
  }

  try {
    return NextResponse.json(await getAdminAnalytics());
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
