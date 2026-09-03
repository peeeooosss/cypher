import { NextResponse } from "next/server";
import { z } from "zod";
import { CategoryFormat, EventStatus, RegistrationMemberRole, RegistrationMemberStatus, RegistrationStatus } from "@/generated/prisma/enums";
import { badRequest, conflict, forbidden, isUniqueConstraintError, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { defaultRosterSize, isTeamFormat } from "@/lib/event-types";

const registrationSchema = z.object({
  categoryId: z.string().cuid().optional(),
  categoryIds: z.array(z.string().cuid()).min(1).optional(),
  teamName: z.string().trim().max(120).optional(),
  memberIds: z.array(z.string().cuid()).max(20).optional(),
  claim: z.literal(true).optional(),
}).refine((data) => data.categoryId !== undefined || data.categoryIds !== undefined, {
  message: "Category is required",
});

function resolvedFormat(format: CategoryFormat | null, eventType: string | null) {
  if (format) return format;
  return eventType === "UNDERGROUND_BATTLE" ? CategoryFormat.BATTLE_1V1 : CategoryFormat.SOLO;
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) return unauthorized();

    const registrations = await prisma.registration.findMany({
      where: {
        OR: [
          { userId: user.id },
          { members: { some: { userId: user.id, status: RegistrationMemberStatus.ACCEPTED } } },
        ],
      },
      include: {
        category: { include: { event: { select: { id: true, title: true, startsAt: true, status: true } } } },
        members: { include: { user: { select: { id: true, name: true, username: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(registrations);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) return unauthorized();
    if (user.role !== "ARTIST") return forbidden();

    const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid registration data");

    const categoryIds = [...new Set(parsed.data.categoryIds ?? (parsed.data.categoryId ? [parsed.data.categoryId] : []))];
    const requestedMemberIds = [...new Set(parsed.data.memberIds ?? [])].filter((id) => id !== user.id);
    const memberIds = [user.id, ...requestedMemberIds];

    const [categories, profile, members] = await Promise.all([
      prisma.category.findMany({
        where: { id: { in: categoryIds } },
        include: { event: { select: { id: true, status: true, eventType: true } } },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { isSuspended: true, name: true, style: true, crew: true, city: true, country: true, experience: true, socialHandle: true, referral: true },
      }),
      prisma.user.findMany({
        where: { id: { in: requestedMemberIds }, role: "ARTIST", isSuspended: false },
        select: { id: true },
      }),
    ]);

    if (!profile) return unauthorized();
    if (profile.isSuspended) return forbidden();
    if (!profile.style || !profile.city || !profile.country || !profile.experience || !profile.socialHandle) {
      return badRequest("Complete your artist profile before registering");
    }
    if (categories.length !== categoryIds.length) return notFound("Category");
    if (members.length !== requestedMemberIds.length) return badRequest("Every team member must be an active artist account");
    if (new Set(categories.map((category) => category.event.id)).size !== 1) {
      return badRequest("Team entries must be created within one event");
    }
    if (categories.some((category) => category.event.status !== EventStatus.PUBLISHED && category.event.status !== EventStatus.LIVE)) {
      return conflict("Registration is closed for this event");
    }

    const firstFormat = resolvedFormat(categories[0].format, categories[0].event.eventType);
    if (categories.some((category) => resolvedFormat(category.format, category.event.eventType) !== firstFormat)) {
      return badRequest("Select categories with the same entry format");
    }

    const roster = defaultRosterSize(firstFormat);
    const invalidRosterCategory = categories.find((category) => {
      const minMembers = Math.max(roster.min, category.minMembers);
      const maxMembers = Math.min(roster.max, category.maxMembers);
      return memberIds.length < minMembers || memberIds.length > maxMembers;
    });
    if (invalidRosterCategory) {
      const minMembers = Math.max(roster.min, invalidRosterCategory.minMembers);
      const maxMembers = Math.min(roster.max, invalidRosterCategory.maxMembers);
      return badRequest(`${invalidRosterCategory.name} requires ${minMembers === maxMembers ? minMembers : `${minMembers}–${maxMembers}`} members`);
    }
    if (isTeamFormat(firstFormat) && !parsed.data.teamName) {
      return badRequest("Team or crew name is required");
    }

    const activeStatuses = { notIn: [RegistrationStatus.WITHDRAWN] };
    const registrations = await prisma.$transaction(async (transaction) => {
      const created = [];
      for (const category of categories) {
        // Clear stale membership rows so previously removed/declined artists can be re-invited
        await transaction.registrationMember.deleteMany({
          where: { categoryId: category.id, userId: { in: memberIds }, status: { in: [RegistrationMemberStatus.DECLINED, RegistrationMemberStatus.REMOVED] } },
        });

        const existingCount = await transaction.registration.count({ where: { categoryId: category.id, status: activeStatuses } });
        if (category.maxCompetitors != null && existingCount >= category.maxCompetitors) {
          throw new Error("CATEGORY_FULL");
        }

        const conflicts = await transaction.registration.findMany({
          where: {
            categoryId: category.id,
            status: activeStatuses,
            OR: [
              { userId: { in: memberIds } },
              { members: { some: { userId: { in: memberIds }, status: { in: [RegistrationMemberStatus.PENDING, RegistrationMemberStatus.ACCEPTED] } } } },
            ],
          },
          select: { id: true },
        });
        if (conflicts.length > 0) throw new Error("MEMBER_ALREADY_REGISTERED");

        const registration = await transaction.registration.create({
          data: {
            userId: user.id,
            categoryId: category.id,
            format: firstFormat,
            teamName: parsed.data.teamName ?? null,
            entryFee: category.entryFee,
            entryCurrency: category.entryCurrency,
            style: profile?.style ?? null,
            crew: profile?.crew ?? null,
            city: profile?.city ?? null,
            country: profile?.country ?? null,
            experience: profile?.experience ?? null,
            socialHandle: profile?.socialHandle ?? null,
            referral: profile?.referral ?? null,
            paidClaimedAt: parsed.data.claim ? new Date() : null,
            members: {
              create: memberIds.map((memberId) => ({
                categoryId: category.id,
                userId: memberId,
                role: memberId === user.id ? RegistrationMemberRole.CAPTAIN : RegistrationMemberRole.MEMBER,
                status: memberId === user.id ? RegistrationMemberStatus.ACCEPTED : RegistrationMemberStatus.PENDING,
                acceptedAt: memberId === user.id ? new Date() : null,
              })),
            },
          },
          include: { category: true, members: { include: { user: { select: { id: true, name: true, username: true } } } } },
        });
        created.push(registration);
      }
      return created;
    });

    return NextResponse.json(registrations, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_FULL") return conflict("This category is full");
    if (error instanceof Error && error.message === "MEMBER_ALREADY_REGISTERED") return conflict("One of these artists is already in this category");
    if (isUniqueConstraintError(error)) return conflict("One of these artists is already registered for this category");
    console.error(error);
    return serverError();
  }
}
