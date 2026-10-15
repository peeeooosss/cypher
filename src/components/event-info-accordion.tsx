import { SectionHeading } from "@/components/section-heading";

export type InfoSection = {
  id: string;
  label: string;
  body: string | null;
};

export function EventInfoAccordion({ sections }: { sections: InfoSection[] }) {
  const visible = sections.filter((s) => s.body && s.body.trim().length > 0);
  if (visible.length === 0) return null;

  return (
    <section id="info" aria-label="Good to know" className="scroll-mt-24">
      <SectionHeading
        eyebrow="Good to know"
        title="Rules & info"
        description="Everything you need before you step in — rules, check-in, stay and food."
      />
      <div className="divide-y divide-line rounded-lg border border-line bg-paper-soft">
        {visible.map((section, index) => (
          <details key={section.id} open={index === 0} className="group px-lg py-md">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-md [&::-webkit-details-marker]:hidden">
              <span className="font-display text-title-md uppercase">{section.label}</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-line font-mono text-body-sm text-ink-muted transition-colors group-open:rotate-45 group-open:border-accent group-open:text-accent">
                +
              </span>
            </summary>
            <p className="mt-md max-w-prose whitespace-pre-wrap text-body-md leading-relaxed text-ink-muted">
              {section.body}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
