import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";

export type PublicJudge = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photoUrl: string | null;
  socialLinks: Record<string, string> | null;
};

function socialLabel(key: string) {
  const lower = key.toLowerCase();
  if (lower.includes("insta")) return "Instagram";
  if (lower.includes("you")) return "YouTube";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function EventJudges({ judges }: { judges: PublicJudge[] }) {
  if (judges.length === 0) return null;

  return (
    <section id="judges" aria-label="Judges" className="scroll-mt-24">
      <SectionHeading
        eyebrow="The panel"
        title="Meet the judges"
        description="The eyes and ears deciding who takes the floor."
      />
      <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-3">
        {judges.map((judge) => (
          <article
            key={judge.id}
            className="group overflow-hidden rounded-lg border border-line bg-paper-soft shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-raised"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-paper-raised">
              {judge.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={judge.photoUrl}
                  alt={`${judge.name} — judge photo`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="font-display text-[4rem] uppercase leading-none text-ink-muted/40">
                    {judge.name.charAt(0) ?? "?"}
                  </span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-md pt-xl">
                {judge.title ? (
                  <Badge tone="accent" className="border-0 bg-accent text-paper">
                    {judge.title}
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="p-lg">
              <h3 className="font-display text-title-lg uppercase leading-tight">{judge.name}</h3>
              {judge.bio ? (
                <p className="mt-sm line-clamp-3 text-body-sm leading-relaxed text-ink-muted">
                  {judge.bio}
                </p>
              ) : null}
              {judge.socialLinks && Object.keys(judge.socialLinks).length > 0 ? (
                <div className="mt-md flex flex-wrap gap-sm">
                  {Object.entries(judge.socialLinks).map(([key, url]) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-line px-sm py-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      {socialLabel(key)}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
