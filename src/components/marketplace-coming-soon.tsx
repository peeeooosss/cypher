import Link from "next/link";

type MarketplaceComingSoonProps = {
  variant?: "marketplace" | "rates";
  compact?: boolean;
};

export function MarketplaceComingSoon({ variant = "marketplace", compact = false }: MarketplaceComingSoonProps) {
  const isRates = variant === "rates";

  return (
    <section className={`${compact ? "mt-section" : "mt-lg"} border border-line bg-paper-soft p-lg`}>
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-accent">
            {isRates ? "Gig price rates" : "Marketplace"}
          </p>
          <h2 className="mt-sm font-display text-title-md uppercase">Coming soon</h2>
        </div>
        {!compact && (
          <span className="border border-accent px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.15em] text-accent">
            In build
          </span>
        )}
      </div>

      <div className="relative mt-lg overflow-hidden border border-line">
        <div aria-hidden="true" className="pointer-events-none select-none space-y-sm p-md opacity-55 blur-[5px]">
          <div className="flex items-center justify-between border border-line bg-paper px-md py-sm">
            <span className="font-display text-title-sm uppercase">{isRates ? "Judging rate" : "Live gig brief"}</span>
            <span className="font-mono text-body-sm">₹ ———</span>
          </div>
          <div className="flex items-center justify-between border border-line bg-paper px-md py-sm">
            <span className="font-display text-title-sm uppercase">{isRates ? "Workshop rate" : "Organizer opportunity"}</span>
            <span className="font-mono text-body-sm">₹ ———</span>
          </div>
          <div className="h-16 border border-line bg-paper" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-paper/65 p-md text-center">
          <p className="border border-accent bg-paper px-lg py-md font-mono text-[0.75rem] font-bold uppercase tracking-[0.18em] text-accent">
            Coming soon
          </p>
        </div>
      </div>

      {isRates ? (
        <p className="mt-lg max-w-3xl text-body-sm text-ink-muted">
          Artist day-rate settings are being prepared. You&apos;ll be able to publish your minimum judging and workshop rates when the marketplace opens.
        </p>
      ) : (
        <div className="mt-lg max-w-3xl">
          <p className="text-body-sm text-ink-muted">
            The marketplace is where artists will find freelance opportunities posted by organizers: judging, workshops, performances, choreography, MC work and event support.
          </p>
          <p className="mt-sm text-body-sm text-ink-muted">
            When it launches, you&apos;ll browse gigs by skill, location and date, open the full brief, send a proposal, receive offers and chat with organizers before agreeing to the work.
          </p>
        </div>
      )}

      {compact && (
        <Link
          href="/artist/marketplace"
          className="mt-lg inline-block border border-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent hover:bg-accent hover:text-paper"
        >
          Learn about marketplace
        </Link>
      )}
    </section>
  );
}
