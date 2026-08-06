import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { ArtistDirectory, type DirectoryArtist } from "@/components/artist-directory";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function OrganizerArtistsPage() {
  await requireRole("ORGANIZER");

  const users = await prisma.user.findMany({
    where: { role: UserRole.ARTIST },
    select: {
      id: true,
      name: true,
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

  const artists: DirectoryArtist[] = users.map((u) => ({
    id: u.id,
    name: u.name,
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

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <Link
        href="/organizer"
        className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
      >
        &larr; Back to console
      </Link>
      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
            Artist directory
          </p>
          <h1 className="font-display text-display-lg uppercase">Know who&apos;s on the floor.</h1>
          <p className="mt-sm text-body-sm text-ink-muted">
            Browse artist profiles, battle records and achievements before you book or shortlist.
          </p>
        </div>
        <SignOutButton />
      </div>

      <ArtistDirectory artists={artists} />
    </main>
  );
}
