export default function PlayerCardSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-3 p-3 bg-gray-800/60 rounded-xl border border-gray-700">
      <div className="w-8 h-8 rounded-full bg-gray-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-700 rounded w-2/3" />
        <div className="h-2 bg-gray-700 rounded w-1/3" />
      </div>
      <div className="w-12 h-4 bg-gray-700 rounded" />
    </div>
  );
}
