import { NextResponse } from "next/server";
import { parsePayuForm } from "@/lib/payu";
import { processPayuResponse } from "@/lib/payu-processing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const fields = parsePayuForm(await request.text());
  const result = await processPayuResponse(fields);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
  const redirect = new URL("/payments/result", appUrl);
  redirect.searchParams.set("status", result.status);
  if (result.paymentId) redirect.searchParams.set("paymentId", result.paymentId);
  if (result.error) redirect.searchParams.set("error", result.error);
  return NextResponse.redirect(redirect, 303);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fields = Object.fromEntries(url.searchParams.entries());
  const result = await processPayuResponse(fields);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? url.origin;
  const redirect = new URL("/payments/result", appUrl);
  redirect.searchParams.set("status", result.status);
  if (result.paymentId) redirect.searchParams.set("paymentId", result.paymentId);
  if (result.error) redirect.searchParams.set("error", result.error);
  return NextResponse.redirect(redirect, 303);
}
