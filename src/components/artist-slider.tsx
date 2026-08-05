"use client";

const categories = [
  "Dancers",
  "Choreographers",
  "DJs",
  "Guitarists",
  "Drummers",
  "Performers",
  "Rappers",
  "Vocalists",
  "Producers",
  "Beatboxers",
  "Visual artists",
  "Photographers",
];

export function ArtistSlider() {
  const loop = [...categories, ...categories];

  return (
    <section className="border-b border-line bg-paper-soft">
      <style>{`
        @keyframes artist-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .artist-scroll-track {
          animation: artist-scroll 30s linear infinite;
        }
        .artist-scroll-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
        <p className="font-mono text-center text-body-sm uppercase tracking-[0.2em] text-accent">
          This space is for you if you are
        </p>
        <div className="relative mt-xl overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-paper-soft to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-paper-soft to-transparent" />
          <div className="flex w-max animate-[artist-scroll_30s_linear_infinite] gap-sm hover:[animation-play-state:paused]">
            {loop.map((cat, i) => (
              <span
                key={`${cat}-${i}`}
                className="shrink-0 border border-line bg-paper px-lg py-md font-display text-title-md uppercase tracking-[-0.02em] transition-colors hover:border-accent hover:text-accent"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}