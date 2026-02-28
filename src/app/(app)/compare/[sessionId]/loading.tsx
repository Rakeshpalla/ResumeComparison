/**
 * Shown immediately while compare page loads (Suspense). Improves perceived performance.
 */
export default function CompareLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg bg-white/10" />
          <div className="h-4 w-48 rounded bg-white/5" />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex gap-4">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-3/4 rounded bg-white/10" />
            <div className="h-4 w-full rounded bg-white/5" />
            <div className="h-4 w-1/2 rounded bg-white/5" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white/10" />
          <div className="h-5 w-40 rounded bg-white/10" />
        </div>
        <div className="h-4 w-full rounded bg-white/5 mb-2" />
        <div className="h-4 w-2/3 rounded bg-white/5" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex gap-2 mb-6">
          <div className="h-9 w-32 rounded bg-white/10" />
          <div className="h-9 w-28 rounded bg-white/5" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
