import { ArtistDirectory } from "@/components/artist-directory";
import { getDirectoryArtists } from "@/lib/artists";

export const dynamic = "force-dynamic";

export default async function PublicArtistDirectoryPage() {
  const artists = await getDirectoryArtists();

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <div>
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
          Public artist directory
        </p>
        <h1 className="font-display text-display-lg uppercase">Find your next dancer.</h1>
        <p className="mt-sm max-w-2xl text-body-sm text-ink-muted">
          Browse the CYPHR roster — style, crew, battle records and achievements from every
          event on the platform. Open a profile to see the full battle history.
        </p>
      </div>

      <ArtistDirectory artists={artists} baseHref="/artist/directory" isPublic />
    </main>
  );
}
