import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-md py-section md:px-xl" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-2/5 max-w-sm" />
      <Skeleton className="mt-2 h-4 w-3/5 max-w-md" />
      <div className="mt-lg grid gap-md sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-line bg-paper-soft p-md">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
        <div className="rounded-lg border border-line bg-paper-soft p-md">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="mt-3 h-5 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
        <div className="hidden rounded-lg border border-line bg-paper-soft p-md sm:block lg:block">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="mt-3 h-5 w-3/5" />
          <Skeleton className="mt-2 h-4 w-2/5" />
        </div>
      </div>
      <div className="mt-lg">
        <ListSkeleton rows={3} />
      </div>
    </main>
  );
}
