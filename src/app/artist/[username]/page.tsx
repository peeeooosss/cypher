import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArtistIdByUsername, getArtistProfile } from "@/lib/artists";
import { getCurrentUser } from "@/lib/rbac";
import { normalizeUsernameParam } from "@/lib/profile-url";
import { PublicArtistProfile } from "@/components/public-artist-profile";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ username: string }> };

async function resolveUserId(param: string): Promise<string | null> {
  const handle = normalizeUsernameParam(param);
  if (!handle) return null;
  return getArtistIdByUsername(handle);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const userId = await resolveUserId(username);
  if (!userId) return { title: "Artist not found | CYPHR" };

  const viewer = await getCurrentUser();
  const artist = await getArtistProfile(userId, viewer?.role);
  if (!artist) return { title: "Artist not found | CYPHR" };

  const handle = artist.username ? `@${artist.username}` : artist.name;
  const bits = [artist.style, artist.crew, artist.city].filter(Boolean).join(" · ");
  const description = `${handle} on CYPHR${bits ? ` — ${bits}` : ""}. Battles, wins, works and achievements.`;
  const title = `${artist.name ?? handle} ${artist.username ? `(@${artist.username})` : ""} | CYPHR`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(artist.username ? { url: `/artist/@${artist.username}` } : {}),
      ...(artist.avatarUrl ? { images: [{ url: artist.avatarUrl }] } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function UsernameArtistProfilePage({ params }: PageProps) {
  const { username } = await params;
  const userId = await resolveUserId(username);

  if (!userId) {
    notFound();
  }

  return <PublicArtistProfile userId={userId} />;
}
