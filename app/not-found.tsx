import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#060a17] text-gray-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-2xl">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f97316]/15 border border-[#f97316]/30 text-[#f97316] font-black mb-5">
          404
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">Page not found</h1>
        <p className="mt-3 text-sm text-gray-400 leading-6">
          The page you were looking for does not exist, or it may have moved.
          Use the dashboard to continue working from the main portal.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ea580c] transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-white/5 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
