import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cx("skeleton rounded-md", className)}
      {...rest}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-paper-soft p-md" aria-hidden>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
