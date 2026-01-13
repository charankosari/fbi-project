export default function CasesLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="h-10 w-48 bg-slate-700 rounded animate-pulse"></div>
          <div className="h-10 w-40 bg-slate-700 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-6 animate-pulse">
              <div className="h-6 w-3/4 bg-slate-700 rounded mb-4"></div>
              <div className="h-4 w-full bg-slate-700 rounded mb-2"></div>
              <div className="h-4 w-2/3 bg-slate-700 rounded mb-4"></div>
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-slate-700 rounded"></div>
                <div className="h-6 w-16 bg-slate-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

