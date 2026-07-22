export default function Loading() {
  return (
    <div className="min-h-screen bg-[#060a17] px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="h-8 w-56 rounded-full bg-white/10 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          <div className="h-28 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          <div className="h-28 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
        </div>
        <div className="h-80 rounded-3xl bg-white/5 border border-white/10 animate-pulse" />
      </div>
    </div>
  );
}
