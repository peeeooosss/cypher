import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { GIG_WORK_FEE } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  return user;
}

export async function getAdminStats() {
  const [users, events, registrations, teamEntries, teamMembers, pendingInvitations, flatFeePending, flatFeeRevenue, commissionRevenue, commissionDue, gigCount, gigsOpen, gigWorkVerified, gigWorkPending, categoryCount] =
    await Promise.all([
      prisma.user.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
      prisma.event.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.registration.count(),
      prisma.registration.count({ where: { format: { in: ["DUO", "GROUP", "BATTLE_2V2", "BATTLE_3V3", "CREW_VS_CREW"] } } }),
      prisma.registrationMember.count({ where: { status: "ACCEPTED" } }),
      prisma.registrationMember.count({ where: { status: "PENDING" } }),
      prisma.event.count({ where: { flatFeePaid: false, flatFeePaymentStatus: "PENDING" } }),
      prisma.event.aggregate({
        _sum: { flatFee: true },
        where: { flatFeePaid: true },
      }),
      prisma.event.aggregate({
        _sum: { commissionDue: true },
        where: { commissionPaid: true },
      }),
      prisma.event.aggregate({
        _sum: { commissionDue: true },
        where: { commissionPaid: false, commissionDue: { gt: 0 } },
      }),
      prisma.gig.count(),
      prisma.gig.count({ where: { status: "OPEN" } }),
      prisma.user.count({ where: { role: "ARTIST", gigWorkPaymentStatus: "VERIFIED" } }),
      prisma.user.count({ where: { role: "ARTIST", gigWorkPaymentStatus: "PENDING" } }),
      prisma.category.count(),
    ]);

  return {
    users: users.reduce<Record<string, number>>((acc, row) => {
      acc[row.role] = row._count._all;
      return acc;
    }, {}),
    userTotal: users.reduce((sum, row) => sum + row._count._all, 0),
    events: events.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {}),
    eventTotal: events.reduce((sum, row) => sum + row._count._all, 0),
    registrations,
    teamEntries,
    teamMembers,
    pendingInvitations,
    flatFeePending,
    flatFeeRevenue: flatFeeRevenue._sum.flatFee ?? 0,
    commissionRevenue: commissionRevenue._sum.commissionDue ?? 0,
    commissionDue: commissionDue._sum.commissionDue ?? 0,
    gigCount,
    gigsOpen,
    gigWorkRevenue: gigWorkVerified * GIG_WORK_FEE,
    gigWorkPending,
    categoryCount,
  };
}

export async function getAdminPayments() {
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { flatFeePaymentStatus: "PENDING" },
        { flatFeePaid: true },
        { commissionPaymentStatus: "PENDING" },
        { commissionPaid: true },
      ],
    },
    include: {
      organizer: { select: { id: true, name: true, email: true, upiId: true } },
      _count: { select: { categories: true } },
      categories: { select: { _count: { select: { registrations: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return events;
}

export async function getAdminGigPayments() {
  return prisma.user.findMany({
    where: {
      role: "ARTIST",
      OR: [{ gigWorkPaymentStatus: "PENDING" }, { gigWorkPaidAt: { not: null } }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      gigWorkPaymentStatus: true,
      gigWorkPaymentMethod: true,
      gigWorkPaymentSentAt: true,
      gigWorkPaymentVerifiedBy: true,
      gigWorkPaidAt: true,
      gigWorkExpiresAt: true,
    },
    orderBy: { gigWorkPaymentSentAt: "desc" },
  });
}

export async function getAdminOrganizers() {
  return prisma.user.findMany({
    where: { role: "ORGANIZER" },
    select: {
      id: true,
      name: true,
      email: true,
      upiId: true,
      isSuspended: true,
      createdAt: true,
      _count: { select: { organizedEvents: true, gigs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminOrganizer(userId: string) {
  const organizer = await prisma.user.findFirst({
    where: { id: userId, role: "ORGANIZER" },
    select: {
      id: true,
      name: true,
      email: true,
      upiId: true,
      isSuspended: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { organizedEvents: true, gigs: true } },
    },
  });

  if (!organizer) return null;

  const [events, gigs] = await Promise.all([
    prisma.event.findMany({
      where: { organizerId: userId },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        flatFee: true,
        flatFeePaid: true,
        flatFeePaymentStatus: true,
        commissionDue: true,
        commissionPaid: true,
        createdAt: true,
        _count: { select: { categories: true } },
        categories: { select: { _count: { select: { registrations: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.gig.findMany({
      where: { organizerId: userId },
      select: { id: true, title: true, budget: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { ...organizer, events, gigs };
}

export async function getAdminArtists() {
  return prisma.user.findMany({
    where: { role: "ARTIST" },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      isProfilePublic: true,
      style: true,
      crew: true,
      city: true,
      experience: true,
      socialHandle: true,
      isSuspended: true,
      gigWorkEnabledAt: true,
      gigWorkExpiresAt: true,
      createdAt: true,
      skills: true,
      _count: { select: { registrations: true, teamMemberships: true, achievements: true, gigApplications: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminArtist(userId: string) {
  const artist = await prisma.user.findFirst({
    where: { id: userId, role: "ARTIST" },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      isProfilePublic: true,
      style: true,
      crew: true,
      city: true,
      country: true,
      experience: true,
      socialHandle: true,
      referral: true,
      skills: true,
      isSuspended: true,
      gigWorkEnabledAt: true,
      gigWorkExpiresAt: true,
      createdAt: true,
      updatedAt: true,
       _count: { select: { registrations: true, teamMemberships: true, achievements: true, gigApplications: true } },
    },
  });

  if (!artist) return null;

  const [achievements, registrations, memberships] = await Promise.all([
    prisma.artistAchievement.findMany({
      where: { userId },
      orderBy: { year: "desc" },
    }),
    prisma.registration.findMany({
      where: { userId },
      include: {
        category: { select: { name: true, event: { select: { id: true, title: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.registrationMember.findMany({
      where: { userId, status: "ACCEPTED" },
      include: { registration: { include: { category: { select: { name: true, event: { select: { id: true, title: true } } } } } } },
      orderBy: { acceptedAt: "desc" },
    }),
  ]);

  return { ...artist, achievements, registrations, memberships };
}

export async function getAdminFeedback() {
  const [feedback, byStatus, byType] = await Promise.all([
    prisma.feedback.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.feedback.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);

  return {
    feedback,
    byStatus: byStatus.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {}),
    byType: byType.reduce<Record<string, number>>((acc, row) => {
      acc[row.type] = row._count._all;
      return acc;
    }, {}),
  };
}

export async function getAdminFeedbackItem(id: string) {
  return prisma.feedback.findUnique({ where: { id } });
}

export async function getAdminAnalytics() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [registrationsByMonth, eventsByMonth, revenueByMonth, commissionRevenueByMonth, gigWorkRevenueByMonth, gigsByMonth, registrationsByStatus, categoryDistribution, topEvents] =
    await Promise.all([
      prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT to_char("createdAt", 'YYYY-MM') AS month, COUNT(*)::bigint AS count
        FROM "Registration"
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY month ORDER BY month`,
      prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT to_char("createdAt", 'YYYY-MM') AS month, COUNT(*)::bigint AS count
        FROM "Event"
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY month ORDER BY month`,
      prisma.$queryRaw<Array<{ month: string; revenue: bigint }>>`
        SELECT to_char("flatFeePaidAt", 'YYYY-MM') AS month, COALESCE(SUM("flatFee"), 0)::bigint AS revenue
        FROM "Event"
        WHERE "flatFeePaid" = true AND "flatFeePaidAt" >= ${sixMonthsAgo}
        GROUP BY month ORDER BY month`,
      prisma.$queryRaw<Array<{ month: string; revenue: bigint }>>`
        SELECT to_char("commissionPaidAt", 'YYYY-MM') AS month, COALESCE(SUM("commissionDue"), 0)::bigint AS revenue
        FROM "Event"
        WHERE "commissionPaid" = true AND "commissionPaidAt" >= ${sixMonthsAgo}
        GROUP BY month ORDER BY month`,
      prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT to_char("gigWorkPaidAt", 'YYYY-MM') AS month, COUNT(*)::bigint AS count
        FROM "User"
        WHERE "role" = 'ARTIST' AND "gigWorkPaidAt" IS NOT NULL AND "gigWorkPaidAt" >= ${sixMonthsAgo}
        GROUP BY month ORDER BY month`,
      prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT to_char("createdAt", 'YYYY-MM') AS month, COUNT(*)::bigint AS count
        FROM "Gig"
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY month ORDER BY month`,
      prisma.registration.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.category.groupBy({
        by: ["name"],
        _count: { _all: true },
      }),
      prisma.event.findMany({
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          flatFee: true,
          flatFeePaid: true,
          _count: { select: { categories: true } },
          categories: { select: { _count: { select: { registrations: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  return {
    registrationsByMonth: registrationsByMonth.map((r) => ({ month: r.month, count: Number(r.count) })),
    eventsByMonth: eventsByMonth.map((r) => ({ month: r.month, count: Number(r.count) })),
    revenueByMonth: revenueByMonth.map((r) => ({ month: r.month, revenue: Number(r.revenue) })),
    commissionRevenueByMonth: commissionRevenueByMonth.map((r) => ({ month: r.month, revenue: Number(r.revenue) })),
    gigWorkRevenueByMonth: gigWorkRevenueByMonth.map((r) => ({ month: r.month, revenue: Number(r.count) * GIG_WORK_FEE })),
    gigsByMonth: gigsByMonth.map((r) => ({ month: r.month, count: Number(r.count) })),
    registrationsByStatus: registrationsByStatus.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {}),
    categoryDistribution: categoryDistribution
      .map((c) => ({ name: c.name, count: c._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topEvents: topEvents.map((event) => ({
      id: event.id,
      title: event.title,
      status: event.status,
      flatFeePaid: event.flatFeePaid,
      registrations: event.categories.reduce((sum, c) => sum + c._count.registrations, 0),
      categories: event._count.categories,
    })),
  };
}
