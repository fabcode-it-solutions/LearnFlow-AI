/* ------------------------------------------------------------------ */
/*  Base skeleton primitive                                            */
/* ------------------------------------------------------------------ */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse rounded-lg bg-ink/8 ${className}`} />;
}

/* ------------------------------------------------------------------ */
/*  Card-shaped skeleton                                               */
/* ------------------------------------------------------------------ */

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-ink/6 bg-white p-5">
      {/* Title line */}
      <Skeleton className="mb-3 h-4 w-2/5" />
      {/* Body lines */}
      <Skeleton className="mb-2 h-3 w-full" />
      <Skeleton className="mb-4 h-3 w-3/4" />
      {/* Bottom bar */}
      <Skeleton className="h-8 w-1/3 rounded-md" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Task-item-shaped skeleton                                          */
/* ------------------------------------------------------------------ */

export function TaskSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink/6 bg-white px-4 py-3">
      {/* Checkbox circle */}
      <Skeleton className="size-5 shrink-0 rounded-full" />

      {/* Text lines */}
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>

      {/* Time badge */}
      <Skeleton className="h-6 w-16 shrink-0 rounded-md" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Full dashboard skeleton                                            */
/* ------------------------------------------------------------------ */

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div className="rounded-2xl border border-ink/6 bg-white p-6">
        <Skeleton className="mb-2 h-6 w-1/3" />
        <Skeleton className="mb-4 h-4 w-2/3" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <TaskSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
