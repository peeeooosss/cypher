import { NextResponse } from "next/server";
import { parsePayuForm } from "@/lib/payu";
import { processPayuResponse } from "@/lib/payu-processing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const fields = contentType.includes("application/json")
    ? ((await request.json().catch(() => null)) as Record<string, string> | null)
    : parsePayuForm(await request.text());

  if (!fields || typeof fields !== "object") {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const result = await processPayuResponse(fields);
  return NextResponse.json({ received: true, ...result }, { status: result.error === "Payment not found" ? 404 : 200 });
}
