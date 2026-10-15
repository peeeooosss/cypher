export function EventSubNav({ links }: { links: { id: string; label: string }[] }) {
  if (links.length === 0) return null;

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <nav
        aria-label="Event sections"
        className="mx-auto flex max-w-7xl gap-xs overflow-x-auto px-md py-sm md:px-xl"
      >
        {links.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            className="shrink-0 border border-transparent px-sm py-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
