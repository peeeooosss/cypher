import { SectionHeading } from "@/components/section-heading";

export type PublicOrganizer = {
  name: string | null;
  studioName: string | null;
  studioLogoUrl: string | null;
  studioSince: string | null;
  bio: string | null;
};

export function EventOrganizer({ organizer }: { organizer: PublicOrganizer }) {
  if (!organizer.bio?.trim()) return null;

  return (
    <section id="organizer" aria-label="Organizer" className="scroll-mt-24">
      <SectionHeading
        eyebrow="The host"
        title="Meet the organizer"
        description="The crew behind this event."
      />
      <article className="rounded-lg border border-line bg-paper-soft p-lg">
        <div className="flex flex-wrap items-center gap-md">
          {organizer.studioLogoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={organizer.studioLogoUrl}
              alt="Studio logo"
              loading="lazy"
              decoding="async"
              className="h-16 w-16 rounded-full border border-line object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-paper font-display text-title-lg uppercase text-ink-muted">
              {(organizer.studioName ?? organizer.name ?? "?").charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-display text-title-md uppercase">
              {organizer.studioName ?? organizer.name ?? "Anonymous"}
            </h3>
            {organizer.studioSince ? (
              <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
                Est. {organizer.studioSince}
              </p>
            ) : null}
          </div>
        </div>
        <p className="mt-md max-w-prose whitespace-pre-wrap text-body-md leading-relaxed text-ink-muted">
          {organizer.bio}
        </p>
      </article>
    </section>
  );
}
