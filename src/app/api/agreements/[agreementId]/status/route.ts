import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, conflict, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ agreementId: string }> };

const statusSchema = z.object({
  action: z.enum(["WORK_COMPLETE", "REPORT_PAID", "CONFIRM_PAID", "CANCEL", "DISPUTE"]),
});

export async function PATCH(request: Request, { params }: Context) {
  const { agreementId } = await params;
  const user = await getCurrentUser();

  if (!user) return unauthorized();

  const agreement = await prisma.gigAgreement.findFirst({
    where: {
      id: agreementId,
      OR: [{ organizerId: user.id }, { artistId: user.id }],
    },
    select: { id: true, status: true, organizerId: true, artistId: true },
  });
  if (!agreement) return notFound("Agreement");

  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid action");

  const isArtist = user.id === agreement.artistId;
  const isOrganizer = user.id === agreement.organizerId;

  if (["WORK_COMPLETE", "REPORT_PAID"].includes(parsed.data.action) && !isArtist) return forbidden();
  if (["CONFIRM_PAID", "CANCEL"].includes(parsed.data.action) && !isOrganizer) return forbidden();

  if (!["ACTIVE", "CONNECTION_PENDING", "COMPLETED"].includes(agreement.status) && parsed.data.action !== "DISPUTE") {
    return conflict("This agreement is no longer active");
  }

  try {
    let data: Record<string, unknown> = {};
    const now = new Date();

    switch (parsed.data.action) {
      case "WORK_COMPLETE":
        data = { workCompletedAt: now, status: "COMPLETED" };
        break;
      case "REPORT_PAID":
        data = { paymentReportedAt: now, paymentStatus: "ARTIST_REPORTED" };
        break;
      case "CONFIRM_PAID":
        data = { paymentConfirmedAt: now, paymentStatus: "PAID" };
        break;
      case "CANCEL":
        data = { status: "CANCELLED" };
        break;
      case "DISPUTE":
        data = { paymentStatus: "DISPUTED" };
        break;
    }

    const updated = await prisma.gigAgreement.update({
      where: { id: agreementId },
      data,
      select: { id: true, status: true, paymentStatus: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
