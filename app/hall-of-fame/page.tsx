"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { MockDB, Profile } from "@/lib/db";
import { isAdminUser } from "@/lib/admin";
import { FileText, ExternalLink, ThumbsUp, PlusCircle, Trash2 } from "lucide-react";

interface PptEntry {
  id: string;
  author_id?: string | null;
  year: number;
  team_name: string;
  ps_title: string;
  ps_domain: string;
  track: 'Software' | 'Hardware';
  file_url: string;
  storage_path?: string | null;
  retrospective: string;
  upvotes: number;
}

interface TipEntry {
  id: string;
  author_id?: string | null;
  category: string;
  content: string;
  author: string;
  role: string;
  upvotes: number;
}

export default function HallOfFamePage() {
  const router = useRouter();
  const [ppts, setPpts] = useState<PptEntry[]>([]);
  const [tips, setTips] = useState<TipEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pptVoteMap, setPptVoteMap] = useState<Record<string, number>>({});
  const [tipVoteMap, setTipVoteMap] = useState<Record<string, number>>({});

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  
  const [showPptModal, setShowPptModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);

  const [newTeamName, setNewTeamName] = useState("");
  const [newPsTitle, setNewPsTitle] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newTrack, setNewTrack] = useState<'Software' | 'Hardware'>('Software');
  const [newRetrospective, setNewRetrospective] = useState("");

  const [newCategory, setNewCategory] = useState("PS Selection Strategy");
  const [newContent, setNewContent] = useState("");
  const [newAuthor, setNewAuthor] = useState("");

  const loadArchiveData = async () => {
    setLoading(true);
    const [userData, feedRes] = await Promise.all([
      MockDB.getCurrentUser(),
      fetch("/api/archive/feed", { credentials: "include" }),
    ]);

    const feed = await feedRes.json().catch(() => ({}));

    setCurrentUser(userData);
    setPpts((feed.ppts || []) as any);
    setTips((feed.tips || []) as any);
    setPptVoteMap(
      (feed.pptVotes || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.ppt_id] = (acc[row.ppt_id] || 0) + 1;
        return acc;
      }, {})
    );
    setTipVoteMap(
      (feed.tipVotes || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.tip_id] = (acc[row.tip_id] || 0) + 1;
        return acc;
      }, {})
    );
    setLoading(false);
  };

  useEffect(() => {
    loadArchiveData();
  }, []);

  const handleUpvotePpt = async (id: string) => {
    await MockDB.upvoteArchivePpt(id);
    await loadArchiveData();
  };

  const handleUpvoteTip = async (id: string) => {
    await MockDB.upvoteArchiveTip(id);
    await loadArchiveData();
  };

  const handleAddPpt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName || !newPsTitle) return;

    router.push("/archive/submit");
  };

  const handleAddTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent || !newAuthor) return;

    const { tip } = await MockDB.submitArchiveTip({
      category: newCategory,
      content: newContent,
      author: newAuthor,
      role: "KIET Contributor",
    });
    setTips(prev => [tip as any, ...prev]);
    setShowTipModal(false);
    setNewContent("");
    setNewAuthor("");
  };

  const handleDeletePpt = async (id: string) => {
    if (!confirm("Delete this pitch deck?")) return;
    await MockDB.deleteArchivePpt(id);
    await loadArchiveData();
  };

  const handleDeleteTip = async (id: string) => {
    if (!confirm("Delete this tip?")) return;
    await MockDB.deleteArchiveTip(id);
    await loadArchiveData();
  };

  const sortedPpts = [...ppts].sort((a, b) => (pptVoteMap[b.id] ?? b.upvotes) - (pptVoteMap[a.id] ?? a.upvotes));
  const sortedTips = [...tips].sort((a, b) => (tipVoteMap[b.id] ?? b.upvotes) - (tipVoteMap[a.id] ?? a.upvotes));

  const filteredPpts = sortedPpts.filter(p => {
    const matchesYear = !selectedYear || p.year.toString() === selectedYear;
    const matchesTrack = !selectedTrack || p.track === selectedTrack;
    return matchesYear && matchesTrack;
  });

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Hall of Fame</h2>
            <p className="text-xs text-gray-400 mt-1">Archive of past KIET hackathon finalist decks, slide templates, and tips.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/archive/submit")}
              className="px-3.5 py-2 bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:opacity-90 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md"
            >
              <PlusCircle className="h-4 w-4" /> Upload Pitch Deck
            </button>
            <button
              onClick={() => setShowTipModal(true)}
              className="px-3.5 py-2 bg-white/5 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
            >
              <PlusCircle className="h-4 w-4" /> Share Tip
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#f97316]" /> Presentation & Pitch Archive
              </h3>

              <div className="flex gap-3">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-[#0a0f1d] border border-white/10 rounded px-2.5 py-1 text-xs text-white"
                >
                  <option value="">All Years</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value)}
                  className="bg-[#0a0f1d] border border-white/10 rounded px-2.5 py-1 text-xs text-white"
                >
                  <option value="">All Tracks</option>
                  <option value="Software">Software</option>
                  <option value="Hardware">Hardware</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="h-48 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
            ) : filteredPpts.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-white/10 bg-white/5 text-center text-gray-400">
                <p className="text-sm font-semibold text-white">No finalist decks yet.</p>
                <p className="text-xs mt-1">Add the first real archive entry when a team submits its presentation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPpts.map((ppt) => (
                  <div key={ppt.id} className="glass p-5 rounded-2xl border border-white/10 flex flex-col justify-between gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block tracking-wider uppercase">
                          SIH {ppt.year} • {ppt.track} Track
                        </span>
                        <h4 className="text-base font-bold text-white mt-1">{ppt.team_name}</h4>
                        <p className="text-xs text-[#f97316] font-semibold mt-0.5">{ppt.ps_title}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
                        {ppt.ps_domain}
                      </span>
                    </div>

                    <div className="p-3 bg-black/25 border border-white/5 rounded-lg text-xs">
                      <span className="font-semibold text-gray-300 block mb-1">Key Retrospective Lesson:</span>
                      <p className="text-gray-400 italic">&quot;{ppt.retrospective}&quot;</p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <a
                        href={ppt.file_url}
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        View Presentation Deck <ExternalLink className="h-3 w-3" />
                      </a>

                      <div className="flex items-center gap-2">
                        {(currentUser && (ppt.author_id === currentUser.id || isAdminUser(currentUser))) && (
                          <button
                            onClick={() => handleDeletePpt(ppt.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 rounded-md border border-red-500/20 text-xs font-semibold text-red-300 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        )}
                        <button
                          onClick={() => handleUpvotePpt(ppt.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 text-xs font-semibold text-gray-300 transition-colors"
                        >
                          <ThumbsUp className="h-3.5 w-3.5 text-[#f97316]" /> {(pptVoteMap[ppt.id] ?? ppt.upvotes)} Upvotes
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="pb-4 border-b border-white/5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-yellow-400" /> Standout Finalist Tips
              </h3>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="h-40 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
              ) : tips.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-white/10 bg-white/5 text-center text-gray-400 text-xs">
                  No tips have been shared yet.
                </div>
              ) : (
                sortedTips.map((tip) => (
                <div key={tip.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3 text-xs">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 text-[9px] font-bold uppercase tracking-wider block w-fit">
                      {tip.category}
                    </span>
                    <p className="text-gray-300 mt-2 italic leading-relaxed">
                      &quot;{tip.content}&quot;
                    </p>
                  </div>

                    <div className="flex justify-between items-center pt-3 border-t border-white/5 text-[10px]">
                      <div>
                        <span className="font-bold text-white block">{tip.author}</span>
                        <span className="text-gray-400 block">{tip.role}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(currentUser && (tip.author_id === currentUser.id || isAdminUser(currentUser))) && (
                          <button
                            onClick={() => handleDeleteTip(tip.id)}
                            className="flex items-center gap-1 px-2.5 py-0.5 bg-red-500/10 hover:bg-red-500/20 rounded text-[10px] text-red-300"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        )}
                        <button
                          onClick={() => handleUpvoteTip(tip.id)}
                          className="flex items-center gap-1 px-2.5 py-0.5 bg-black/20 hover:bg-black/35 rounded text-[10px] text-gray-400"
                        >
                          <ThumbsUp className="h-3 w-3 text-[#f97316]" /> {(tipVoteMap[tip.id] ?? tip.upvotes)}
                        </button>
                      </div>
                    </div>
                </div>
              ))
              )}
            </div>
          </div>

        </div>

      </main>

      {/* SHARE PPT MODAL */}
      {showPptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl border border-white/15 p-6 relative">
            <h3 className="text-lg font-bold text-white mb-4">Share Past Finalist Presentation Deck</h3>

            <form onSubmit={handleAddPpt} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="ppt-team-name" className="text-xs font-semibold text-gray-300">Team Name</label>
                  <input
                    id="ppt-team-name"
                    name="team_name"
                    type="text"
                    required
                    placeholder="e.g. ByteMasters"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ppt-track" className="text-xs font-semibold text-gray-300">Track Type</label>
                  <select
                    id="ppt-track"
                    name="track"
                    value={newTrack}
                    onChange={(e) => setNewTrack(e.target.value as 'Software' | 'Hardware')}
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="Software">Software</option>
                    <option value="Hardware">Hardware</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="ppt-ps-title" className="text-xs font-semibold text-gray-300">Problem Statement Title</label>
                <input
                  id="ppt-ps-title"
                  name="ps_title"
                  type="text"
                  required
                  placeholder="e.g. Crop disease recommendation"
                  value={newPsTitle}
                  onChange={(e) => setNewPsTitle(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="ppt-domain" className="text-xs font-semibold text-gray-300">Problem Category / Domain</label>
                <input
                  id="ppt-domain"
                  name="ps_domain"
                  type="text"
                  placeholder="e.g. Agriculture"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="ppt-retrospective" className="text-xs font-semibold text-gray-300">Key Retrospective / Advice</label>
                <textarea
                  id="ppt-retrospective"
                  name="retrospective"
                  rows={3}
                  required
                  placeholder="What was the biggest learning? What worked best for the jury?"
                  value={newRetrospective}
                  onChange={(e) => setNewRetrospective(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPptModal(false)}
                  className="px-4 py-2 border border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg text-xs font-semibold"
                >
                  Submit Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE TIP MODAL */}
      {showTipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl border border-white/15 p-6 relative">
            <h3 className="text-lg font-bold text-white mb-4">Share Finalist Matching Advice Tip</h3>

            <form onSubmit={handleAddTip} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="tip-category" className="text-xs font-semibold text-gray-300">Category Tag</label>
                <select
                  id="tip-category"
                  name="category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="PS Selection Strategy">PS Selection Strategy</option>
                  <option value="PPT Pitching">PPT Pitching</option>
                  <option value="Tech Stack Optimization">Tech Stack Optimization</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="tip-author" className="text-xs font-semibold text-gray-300">Your Name (Author)</label>
                <input
                  id="tip-author"
                  name="author"
                  type="text"
                  required
                  placeholder="e.g. Aditya Gupta"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="tip-content" className="text-xs font-semibold text-gray-300">Advice Content</label>
                <textarea
                  id="tip-content"
                  name="content"
                  rows={4}
                  required
                  placeholder="Write clear, actionable advice for current aspirants..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTipModal(false)}
                  className="px-4 py-2 border border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg text-xs font-semibold"
                >
                  Submit Tip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
