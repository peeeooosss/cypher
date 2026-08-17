import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, conflict, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ gigId: string; applicationId: string }> };

const offerSchema = z.object({
  offerAmount: z.number().int().min(1).max(100000000).optional(),
  workDate: z.coerce.date().optional(),
  location: z.string().trim().max(200).optional(),
  scope: z.string().trim().max(5000).optional(),
  deliverables: z.string().trim().max(5000).optional(),
  cancellationTerms: z.string().trim().max(5000).optional(),
  paymentTerms: z.string().trim().max(5000).optional(),
});

export async function POST(request: Request, { params }: Context) {
  const { gigId, applicationId } = await params;
  const user = await getCurrentUser();

  if (!user) return unauthorized();
  if (user.role !== "ORGANIZER") return forbidden();

  const gig = await prisma.gig.findFirst({
    where: { id: gigId, organizerId: user.id },
    select: { id: true },
  });
  if (!gig) return notFound("Gig");

  const application = await prisma.gigApplication.findFirst({
    where: { id: applicationId, gigId },
    select: { id: true, artistId: true, status: true },
  });
  if (!application) return notFound("Application");

  const parsed = offerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid offer data");

  const existing = await prisma.gigAgreement.findUnique({
    where: { applicationId },
    select: { status: true },
  });
  if (existing && ["CONNECTION_PENDING", "ACTIVE", "COMPLETED"].includes(existing.status)) {
    return conflict("An offer has already been sent for this application");
  }

  try {
    await prisma.$transaction([
      prisma.gigApplication.update({
        where: { id: applicationId },
        data: { status: "ACCEPTED" },
      }),
      prisma.gigAgreement.upsert({
        where: { applicationId },
        update: {
          status: "PENDING_ARTIST",
          organizerSignedAt: new Date(),
          artistSignedAt: null,
          connectionPaidAt: null,
          workCompletedAt: null,
          paymentReportedAt: null,
          paymentConfirmedAt: null,
          paymentStatus: "NOT_REPORTED",
          offerAmount: parsed.data.offerAmount ?? null,
          workDate: parsed.data.workDate ?? null,
          location: parsed.data.location ?? null,
          scope: parsed.data.scope ?? null,
          deliverables: parsed.data.deliverables ?? null,
          cancellationTerms: parsed.data.cancellationTerms ?? null,
          paymentTerms: parsed.data.paymentTerms ?? null,
        },
        create: {
          gigId,
          applicationId,
          organizerId: user.id,
          artistId: application.artistId,
          organizerSignedAt: new Date(),
          offerAmount: parsed.data.offerAmount ?? null,
          workDate: parsed.data.workDate ?? null,
          location: parsed.data.location ?? null,
          scope: parsed.data.scope ?? null,
          deliverables: parsed.data.deliverables ?? null,
          cancellationTerms: parsed.data.cancellationTerms ?? null,
          paymentTerms: parsed.data.paymentTerms ?? null,
        },
      }),
      prisma.conversation.upsert({
        where: { applicationId },
        update: {},
        create: {
          gigId,
          applicationId,
          organizerId: user.id,
          artistId: application.artistId,
          status: "OPEN",
        },
      }),
    ]);

    const agreement = await prisma.gigAgreement.findUnique({
      where: { applicationId },
      select: { id: true, status: true, offerAmount: true },
    });

    return NextResponse.json(agreement, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
