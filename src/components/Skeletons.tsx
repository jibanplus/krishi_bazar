export function CommodityCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-40 w-full" />
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton h-6 w-1/2" />
      <div className="flex gap-2">
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-4 w-1/3" />
      </div>
    </div>
  );
}

export function HighRiskCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      </div>
      <div className="skeleton h-8 w-full" />
      <div className="skeleton h-4 w-full" />
    </div>
  );
}

export function RowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="card p-4">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-4 flex-1" />
        ))}
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton h-8 w-2/3" />
      <div className="skeleton h-3 w-1/3" />
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>লোড হচ্ছে...</p>
      </div>
    </div>
  );
}
