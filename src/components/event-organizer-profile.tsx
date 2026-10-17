import { SectionHeading } from "@/components/section-heading";

export type OrganizerProfile = {
  name: string | null;
  studioName: string | null;
  photoUrl: string | null;
  bio: string | null;
};

export function EventOrganizerProfile({ organizer }: { organizer: OrganizerProfile }) {
  if (!organizer.photoUrl && !organizer.bio?.trim()) return null;

  return (
    <section id="host" aria-label="Organizer photo and bio" className="scroll-mt-24">
      <SectionHeading
        eyebrow="The host"
        title="Organizer photo & bio"
        description="Get to know the crew behind this event."
      />
      <article className="rounded-lg border border-line bg-paper-soft p-lg">
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          {organizer.photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={organizer.photoUrl}
              alt={organizer.studioName ?? organizer.name ?? "Organizer photo"}
              loading="lazy"
              decoding="async"
              className="h-32 w-32 shrink-0 rounded-lg border border-line object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <h3 className="font-display text-title-md uppercase">
              {organizer.studioName ?? organizer.name ?? "Anonymous"}
            </h3>
            {organizer.bio ? (
              <p className="mt-md max-w-prose whitespace-pre-wrap text-body-md leading-relaxed text-ink-muted">
                {organizer.bio}
              </p>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}
