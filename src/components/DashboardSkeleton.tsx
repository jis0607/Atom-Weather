export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading weather forecast">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0D1528] p-6 sm:p-7 h-[430px] flex flex-col justify-between">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-7 w-44 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="flex items-center gap-6">
            <div className="w-28 h-28 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-3">
              <div className="h-14 w-32 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-5 w-28 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0D1528] p-6 sm:p-7 h-[430px] space-y-5">
          <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2">
            <div className="h-3.5 w-full rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3.5 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="space-y-2 pt-4">
            <div className="h-3.5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3.5 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="space-y-2 pt-4">
            <div className="h-3.5 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3.5 w-full rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0D1528] p-6 sm:p-7 h-80" />
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0D1528] p-6 sm:p-7 h-72" />
    </div>
  );
}
