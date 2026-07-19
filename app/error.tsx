"use client";

import { useEffect } from "react";
import Navbar from "@/components/Navbar";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to console/Vercel standard logs
    console.error("Uncaught application crash error captured:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col justify-center items-center px-4 text-center max-w-md mx-auto">
        <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-full h-12 w-12 flex items-center justify-center text-red-500 mb-4">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-white">Application Exception Caught</h2>
        <p className="text-xs text-gray-400 mt-2 mb-6">
          An unexpected runtime error has occurred. Details have been logged to the Vercel monitoring panel.
        </p>

        <div className="flex gap-4">
          <button
            onClick={() => window.location.href = "/"}
            className="px-4 py-2 border border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            Home Page
          </button>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Reset Workspace
          </button>
        </div>
      </main>
    </div>
  );
}
