import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background sticky top-0 z-10 flex h-14 items-center justify-between border-b px-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-7 w-56" />
        </div>
        <Skeleton className="h-8 w-28" />
      </header>
      <div className="flex-1 space-y-2 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
