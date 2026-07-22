"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { MockDB, Profile } from "@/lib/db";
import { ArrowLeft, FileUp, UploadCloud, Sparkles, ShieldCheck } from "lucide-react";

export default function ArchiveSubmitPage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [psTitle, setPsTitle] = useState("");
  const [psDomain, setPsDomain] = useState("");
  const [track, setTrack] = useState<"Software" | "Hardware">("Software");
  const [year, setYear] = useState(2026);
  const [retrospective, setRetrospective] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    async function init() {
      const currentUser = await MockDB.getCurrentUser();
      if (!currentUser) {
        router.push("/");
        return;
      }
      setUser(currentUser);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please choose a PDF pitch deck.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("team_name", teamName);
      formData.append("ps_title", psTitle);
      formData.append("ps_domain", psDomain || "General");
      formData.append("track", track);
      formData.append("year", String(year));
      formData.append("retrospective", retrospective);

      await MockDB.submitArchivePpt(formData);
      alert("Pitch deck uploaded to the archive.");
      router.push("/hall-of-fame");
    } catch (err: any) {
      alert(err?.message || "Failed to upload pitch deck.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#060a17] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-[#f97316] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="glass rounded-3xl border border-white/10 p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] text-[10px] font-bold uppercase tracking-[0.2em]">
                  <UploadCloud className="h-3.5 w-3.5" />
                  Archive Submission
                </span>
                <h1 className="text-3xl font-black text-white mt-4">Upload a real pitch deck</h1>
                <p className="text-sm text-gray-400 mt-2">
                  Share a finalist-ready PDF so future teams can learn from the actual submission.
                </p>
              </div>
              <div className="hidden md:flex h-12 w-12 rounded-2xl bg-white/5 border border-white/10 items-center justify-center text-[#10b981]">
                <FileUp className="h-5 w-5" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Team Name</label>
                  <input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316]"
                    placeholder="e.g. ByteStorm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Problem Statement Title</label>
                  <input
                    value={psTitle}
                    onChange={(e) => setPsTitle(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316]"
                    placeholder="e.g. Smart irrigation assistant"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Domain</label>
                  <input
                    value={psDomain}
                    onChange={(e) => setPsDomain(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316]"
                    placeholder="e.g. Agriculture"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Track</label>
                  <select
                    value={track}
                    onChange={(e) => setTrack(e.target.value as "Software" | "Hardware")}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316]"
                  >
                    <option value="Software">Software</option>
                    <option value="Hardware">Hardware</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Submission Year</label>
                  <input
                    type="number"
                    min={2024}
                    max={2030}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Pitch Deck PDF</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Retrospective</label>
                <textarea
                  rows={5}
                  value={retrospective}
                  onChange={(e) => setRetrospective(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316]"
                  placeholder="What did your team learn? What should future teams repeat or avoid?"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Uploading
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Publish to Archive
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-4">
            <div className="glass rounded-3xl border border-white/10 p-6">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#10b981]" />
                Upload Rules
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-400">
                <li>Only PDF files are accepted.</li>
                <li>Use the real finalist deck, not a placeholder.</li>
                <li>The archive entry will be tied to your profile for deletion.</li>
                <li>Future users will see your retrospective and file link publicly.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-dashed border-[#f97316]/30 bg-[#f97316]/5 p-6 text-sm text-orange-100">
              This flow is now production-aligned with Supabase Storage and the `archive_ppts` table.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
