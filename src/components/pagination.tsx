import Link from "next/link";

function buildPages(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  for (const p of [1, 2, current - 1, current, current + 1, total - 1, total]) {
    if (p >= 1 && p <= total) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: Array<number | "gap"> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      items.push("gap");
    }
    items.push(sorted[i]);
  }
  return items;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const href = (page: number) => (page === 1 ? basePath : `${basePath}?page=${page}`);

  return (
    <nav className="mt-lg flex flex-wrap items-center justify-center gap-sm" aria-label="Results pages">
      <Link
        href={href(currentPage - 1)}
        aria-disabled={currentPage <= 1}
        className={`border px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] ${
          currentPage <= 1
            ? "pointer-events-none border-line text-ink-muted/50"
            : "border-line text-ink hover:border-accent hover:text-accent"
        }`}
      >
        Prev
      </Link>
      {buildPages(currentPage, totalPages).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-sm font-mono text-ink-muted">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            className={`border px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] ${
              item === currentPage
                ? "border-accent bg-accent text-paper"
                : "border-line text-ink hover:border-accent hover:text-accent"
            }`}
          >
            {item}
          </Link>
        ),
      )}
      <Link
        href={href(currentPage + 1)}
        aria-disabled={currentPage >= totalPages}
        className={`border px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] ${
          currentPage >= totalPages
            ? "pointer-events-none border-line text-ink-muted/50"
            : "border-line text-ink hover:border-accent hover:text-accent"
        }`}
      >
        Next
      </Link>
    </nav>
  );
}
