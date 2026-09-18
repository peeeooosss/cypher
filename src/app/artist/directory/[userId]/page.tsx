import { notFound } from "next/navigation";
import { getArtistProfile } from "@/lib/artists";
import { getCurrentUser } from "@/lib/rbac";
import { ArtistProfileView } from "@/components/artist-profile-view";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ userId: string }> };

export default async function PublicArtistProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const viewer = await getCurrentUser();
  const artist = await getArtistProfile(userId, viewer?.role);

  if (!artist) {
    notFound();
  }

  const totalMatches = artist.registrations.reduce((s, r) => s + r.matchesAsA.length + r.matchesAsB.length, 0);
  const totalWins = artist.registrations.reduce((s, r) => s + r.matchesWon.length, 0);
  const joined = artist.createdAt;

  return (
    <ArtistProfileView
      artist={{
        id: artist.id,
        name: artist.name,
        username: artist.username,
        avatarUrl: artist.avatarUrl,
        coverUrl: artist.coverUrl,
        style: artist.style,
        crew: artist.crew,
        city: artist.city,
        country: artist.country,
        experience: artist.experience,
        socialHandle: artist.socialHandle,
        keywords: artist.keywords,
        bio: artist.bio,
        skills: artist.skills,
        socialLinks: artist.socialLinks as Record<string, string> | null,
        hourlyRate: artist.hourlyRate,
        responseTime: artist.responseTime,
        isProfilePublic: artist.isProfilePublic,
        isOwnProfile: viewer?.id === artist.id,
      }}
      stats={{
        battles: totalMatches,
        wins: totalWins,
        achievements: artist.achievements.length,
        joined,
      }}
      works={artist.works.map((w) => ({
        id: w.id,
        title: w.title,
        description: w.description,
        videoUrl: w.videoUrl,
        thumbnailUrl: w.thumbnailUrl,
        platform: w.platform,
        order: w.order,
        isPublished: w.isPublished,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      }))}
      achievements={artist.achievements}
      registrations={artist.registrations}
      canHire={viewer?.role === "ORGANIZER" || viewer?.role === "ADMIN"}
    />
  );
}