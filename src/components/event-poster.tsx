import { cx } from "@/components/ui/cx";

/**
 * Poster-aware event artwork.
 * - `cover`: uniform fill for grids (object-cover) with a shimmer base.
 * - `contain`: uncropped poster on a soft blurred fill so faces/text survive.
 * - Missing posters get a branded fallback block instead of an empty hole.
 */
export function EventPoster({
  posterUrl,
  title,
  fit = "cover",
  className,
  imgClassName,
  eager = false,
}: {
  posterUrl?: string | null;
  title: string;
  fit?: "cover" | "contain";
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  if (!posterUrl) {
    return (
      <div
        className={cx(
          "relative flex items-center justify-center overflow-hidden bg-paper-raised",
          className,
        )}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,var(--accent)_0%,transparent_55%)] opacity-25" />
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.08]">
          <span className="font-display text-[6rem] leading-none tracking-wide">CYPHR</span>
        </div>
        <span className="relative rounded-full border border-line-strong px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-muted">
          Artwork soon
        </span>
      </div>
    );
  }

  if (fit === "contain") {
    return (
      <div className={cx("relative overflow-hidden bg-paper-raised", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl saturate-150"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-paper/40" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterUrl}
          alt={`${title} poster`}
          className="animate-fade-in relative mx-auto max-h-[70vh] w-auto max-w-full object-contain shadow-raised"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div className={cx("skeleton relative overflow-hidden bg-paper-raised", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterUrl}
        alt={`${title} poster`}
        className={cx("animate-fade-in h-full w-full object-cover", imgClassName)}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </div>
  );
}
