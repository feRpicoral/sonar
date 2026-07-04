import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b px-6">
        <Skeleton className="h-5 w-24" />
      </header>
      <div className="space-y-5 px-6 py-7">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </section>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
