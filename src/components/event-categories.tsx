import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { formatFee } from "@/lib/format";
import { formatLabel } from "@/lib/event-types";

export type PublicCategory = {
  id: string;
  name: string;
  format: string | null;
  minMembers: number;
  maxMembers: number;
  entryFee: number | null;
  entryCurrency: string;
  maxCompetitors: number | null;
  registeredCount: number;
  prizeTotal: number;
  prizeCurrency: string;
};

function spotsLeft(category: PublicCategory): number | null {
  if (category.maxCompetitors == null) return null;
  return Math.max(0, category.maxCompetitors - category.registeredCount);
}

export function EventCategories({
  categories,
  isWorkshop,
  registerHref,
  totalPrize,
}: {
  categories: PublicCategory[];
  isWorkshop: boolean;
  registerHref: string | null;
  totalPrize: number;
}) {
  return (
    <section id="categories" aria-label={isWorkshop ? "Sessions" : "Categories"} className="scroll-mt-24">
      <SectionHeading
        eyebrow={isWorkshop ? "The sessions" : "The battleground"}
        title={isWorkshop ? `Sessions (${categories.length})` : `Categories (${categories.length})`}
        description={
          isWorkshop
            ? "Pick the sessions you want to join."
            : "Pick your arena. Every category is a separate entry with its own prize."
        }
      />

      {totalPrize > 0 ? (
        <div className="mb-lg flex flex-wrap items-center justify-between gap-md rounded-lg border border-accent/40 bg-accent/10 px-lg py-md">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-accent">
              Total prize pool
            </p>
            <p className="mt-xs font-display text-display-md tabular-nums text-accent">
              ₹{totalPrize.toLocaleString("en-IN")}
            </p>
          </div>
          {registerHref ? (
            <Link
              href={registerHref}
              className="border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-85"
            >
              Claim your spot →
            </Link>
          ) : null}
        </div>
      ) : null}

      {categories.length === 0 ? (
        <p className="border border-line p-lg text-body-sm text-ink-muted">
          Categories will be announced soon.
        </p>
      ) : (
        <div className="grid gap-md md:grid-cols-2">
          {categories.map((category) => {
            const left = spotsLeft(category);
            const full = left !== null && left <= 0;
            const progress =
              category.maxCompetitors != null && category.maxCompetitors > 0
                ? Math.min(100, Math.round((category.registeredCount / category.maxCompetitors) * 100))
                : null;
            return (
              <article
                key={category.id}
                className="flex flex-col rounded-lg border border-line bg-paper-soft p-lg shadow-card transition-colors hover:border-accent/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-sm">
                  <h3 className="font-display text-title-lg uppercase leading-tight">{category.name}</h3>
                  <Badge tone="accent">{formatLabel(category.format)}</Badge>
                </div>
                <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
                  {category.minMembers === category.maxMembers
                    ? `${category.minMembers} member${category.minMembers === 1 ? "" : "s"}`
                    : `${category.minMembers}–${category.maxMembers} members`}
                  {" · "}
                  {category.registeredCount} {category.registeredCount === 1 ? "entry" : "entries"}
                  {category.maxCompetitors != null ? ` / max ${category.maxCompetitors}` : ""}
                </p>

                {progress != null ? (
                  <div className="mt-md" aria-hidden>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className={`h-full rounded-full ${full ? "bg-accent" : "bg-accent/70"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                      {full ? "Category full" : left != null && left <= 10 ? `Only ${left} spots left` : `${progress}% full`}
                    </p>
                  </div>
                ) : null}

                <div className="mt-md flex flex-wrap items-center gap-sm border-t border-line pt-md">
                  <span className="font-display text-title-md tabular-nums text-accent">
                    {formatFee(category.entryFee, category.entryCurrency)}
                  </span>
                  {category.prizeTotal > 0 ? (
                    <span className="border border-accent/30 bg-accent/10 px-sm py-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-accent">
                      ₹{category.prizeTotal.toLocaleString("en-IN")} prize
                    </span>
                  ) : null}
                  {registerHref && !full ? (
                    <Link
                      href={registerHref}
                      className="ml-auto font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-accent"
                    >
                      Enter →
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
