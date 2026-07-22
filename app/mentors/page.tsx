import { Suspense } from "react";
import MentorsPageClient from "./mentors-client";

export default function MentorsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060a17] flex items-center justify-center text-sm text-gray-400">
          Loading mentors...
        </div>
      }
    >
      <MentorsPageClient />
    </Suspense>
  );
}
