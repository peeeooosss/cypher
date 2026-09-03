import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";
import { confirmEmailVerify } from "@/lib/email-verification";

const requestSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid verification data");

  const email = parsed.data.email.toLowerCase();
  const result = await confirmEmailVerify(email, parsed.data.otp);

  switch (result.status) {
    case "ok":
      return NextResponse.json({ verified: true });
    case "invalid":
      return NextResponse.json(
        { error: result.remaining > 0 ? `Incorrect code. ${result.remaining} attempt${result.remaining === 1 ? "" : "s"} left.` : "Too many incorrect attempts. Request a new code." },
        { status: 400 },
      );
    case "locked":
      return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 400 });
    case "expired":
      return NextResponse.json({ error: "That code has expired. Request a new one." }, { status: 400 });
    default:
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  }
}
