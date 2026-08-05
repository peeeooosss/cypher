import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

export function unauthorized() {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "You do not have permission for this action" }, { status: 403 });
}

export function notFound(resource = "Resource") {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError() {
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
