import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const phoneRaw = typeof body?.phone === "string" ? body.phone : "";
    const phone = phoneRaw.replace(/\D/g, "");

    if (phone.length !== 10) {
      return badRequest("Enter a valid 10-digit mobile number.");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phone },
          { phone: `+91${phone}` },
          { phone: { endsWith: phone } },
        ],
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }

    return NextResponse.json({ exists: true });
  } catch (error) {
    console.error("forgot-password lookup error", error);
    return serverError();
  }
}
