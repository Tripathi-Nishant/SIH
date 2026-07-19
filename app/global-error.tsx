"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#060a17] text-gray-100 flex items-center justify-center px-4">
        <main className="max-w-lg w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 font-black mb-5">
            !
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Something broke</h1>
          <p className="mt-3 text-sm text-gray-400 leading-6">
            The portal hit an unexpected error. You can retry the page or go back to
            the home screen and continue from there.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ea580c] transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-white/5 transition-colors"
            >
              Home
            </Link>
          </div>
          {error.digest && (
            <p className="mt-4 text-[11px] text-gray-500 font-mono break-all">
              Error ID: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
