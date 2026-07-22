export default function Loading() {
  return (
    <div className="min-h-screen bg-[#060a17] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="h-4 w-24 rounded-full bg-white/10 animate-pulse" />
        <div className="h-10 w-3/4 rounded-2xl bg-white/10 animate-pulse" />
        <div className="h-4 w-full rounded-full bg-white/10 animate-pulse" />
        <div className="h-4 w-5/6 rounded-full bg-white/10 animate-pulse" />
        <div className="h-4 w-2/3 rounded-full bg-white/10 animate-pulse" />
      </div>
    </div>
  );
}
