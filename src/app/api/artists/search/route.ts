import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();
    if (currentUser.role !== "ORGANIZER" && currentUser.role !== "ADMIN") return forbidden();

    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return badRequest("Search with at least 2 characters");

    const users = await prisma.user.findMany({
      where: {
        role: "ARTIST",
        isSuspended: false,
        OR: [
          { username: { contains: query.toLowerCase(), mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { crew: { contains: query, mode: "insensitive" } },
          { city: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, username: true, name: true, style: true, crew: true, city: true },
      orderBy: { name: "asc" },
      take: 10,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
