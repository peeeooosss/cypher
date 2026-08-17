import type { DirectoryArtist } from "@/components/artist-directory";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/enums";

export function canViewPrivateProfiles(role?: UserRole | null): boolean {
  return role === UserRole.ORGANIZER || role === UserRole.ARTIST || role === UserRole.ADMIN;
}

export async function getDirectoryArtists(viewerRole?: UserRole | null): Promise<DirectoryArtist[]> {
  const privileged = canViewPrivateProfiles(viewerRole);

  const users = await prisma.user.findMany({
    where: {
      role: UserRole.ARTIST,
      isSuspended: false,
      ...(privileged ? {} : { isProfilePublic: true }),
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      style: true,
      crew: true,
      city: true,
      country: true,
      experience: true,
      socialHandle: true,
      skills: true,
      _count: { select: { achievements: true, registrations: true } },
      registrations: {
        select: {
          matchesWon: { select: { id: true } },
          _count: { select: { matchesAsA: true, matchesAsB: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl,
    style: u.style,
    crew: u.crew,
    city: u.city,
    country: u.country,
    experience: u.experience,
    socialHandle: u.socialHandle,
    skills: u.skills,
    wins: u.registrations.reduce((sum, r) => sum + r.matchesWon.length, 0),
    matches: u.registrations.reduce((sum, r) => sum + r._count.matchesAsA + r._count.matchesAsB, 0),
    registrations: u._count.registrations,
    achievements: u._count.achievements,
  }));
}

export async function getArtistProfile(userId: string, viewerRole?: UserRole | null) {
  const privileged = canViewPrivateProfiles(viewerRole);

  return prisma.user.findFirst({
    where: {
      id: userId,
      role: UserRole.ARTIST,
      isSuspended: false,
      ...(privileged ? {} : { isProfilePublic: true }),
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      style: true,
      crew: true,
      city: true,
      country: true,
      experience: true,
      socialHandle: true,
      skills: true,
      achievements: { orderBy: [{ year: "desc" }, { createdAt: "desc" }] },
      registrations: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              prizePool: { select: { distribution: true, isPaid: true } },
              event: { select: { id: true, title: true } },
            },
          },
          matchesAsA: {
            include: {
              competitorB: { include: { user: { select: { name: true } } } },
              winner: { select: { userId: true } },
              scores: { select: { feedback: true } },
            },
            orderBy: { round: "asc" },
          },
          matchesAsB: {
            include: {
              competitorA: { include: { user: { select: { name: true } } } },
              winner: { select: { userId: true } },
              scores: { select: { feedback: true } },
            },
            orderBy: { round: "asc" },
          },
          matchesWon: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
