import { NextResponse } from "next/server";
import { z } from "zod";
import { FeedbackType } from "@/generated/prisma/enums";
import { badRequest, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const feedbackSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(120).optional(),
  type: z.nativeEnum(FeedbackType).default(FeedbackType.FEEDBACK),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(120),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

export async function POST(request: Request) {
  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid feedback data");
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        name: parsed.data.name ?? null,
        email: parsed.data.email ?? null,
        type: parsed.data.type,
        subject: parsed.data.subject,
        message: parsed.data.message,
      },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
