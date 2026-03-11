export default function ReportLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="h-8 w-36 bg-gray-200 rounded animate-pulse" />
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-8 py-8 w-full flex-1">
        <main className="space-y-12">
          {/* Hero skeleton */}
          <section className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 md:gap-12">
            <div className="space-y-4 w-full md:max-w-md">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="space-y-3">
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex flex-row gap-2 shrink-0 self-start">
              <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </section>

          {/* Room cards skeleton */}
          <section className="space-y-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <article
                key={idx}
                className="w-full rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between w-full px-4 py-3 bg-[#008bff]">
                  <div className="h-4 w-40 bg-white/40 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-white/30 rounded-full animate-pulse" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1 p-4">
                  {Array.from({ length: 4 }).map((__, i) => (
                    <div key={i} className="overflow-hidden block w-full">
                      <div className="aspect-[4/5] w-full bg-gray-200 rounded animate-pulse" />
                      <div className="bg-gray-100 px-2 py-2 mt-1 space-y-2">
                        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

