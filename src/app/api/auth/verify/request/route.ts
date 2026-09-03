import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, serverError } from "@/lib/api";
import { isEmailRegistered, requestEmailVerify } from "@/lib/email-verification";

const requestSchema = z.object({ email: z.string().trim().email() });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid email");

  const email = parsed.data.email.toLowerCase();

  if (await isEmailRegistered(email)) {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }

  try {
    const { sent, cooldown } = await requestEmailVerify(email);
    if (!sent) {
      return NextResponse.json(
        { message: cooldown ? "Please wait a moment before requesting another code." : "A code is on its way." },
        { status: cooldown ? 429 : 200 },
      );
    }
    return NextResponse.json({ message: "A 6-digit code has been sent to your email." });
  } catch (error) {
    console.error("Failed to send verification request", error);
    return serverError();
  }
}
