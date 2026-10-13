import { redirect } from "next/navigation";
import { getArtistProfile } from "@/lib/artists";
import { PublicArtistProfile } from "@/components/public-artist-profile";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ userId: string }> };

/** Legacy ID-based URL — kept working, but canonical portfolios live at /artist/@username. */
export default async function LegacyArtistProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const artist = await getArtistProfile(userId, undefined);

  if (artist?.username) {
    redirect(`/artist/@${artist.username}`);
  }

  return <PublicArtistProfile userId={userId} />;
}
