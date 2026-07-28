"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { MockDB, MentorProfile, Profile, Team, TeamMentor } from "@/lib/db";
import { isAdminUser } from "@/lib/admin";
import { Search, GraduationCap, Clock3, MapPin, MessageCircle, PlusCircle, BadgeCheck, ArrowRight, Star } from "lucide-react";

export default function MentorsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<Profile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [allAssignments, setAllAssignments] = useState<TeamMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const teamId = searchParams.get("team_id") || "";

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [currentUser, mentorsData, assignmentsData, teamsData] = await Promise.all([
        MockDB.getCurrentUser(),
        MockDB.getMentors(),
        MockDB.getTeamMentors(),
        MockDB.getTeams(),
      ]);
      setUser(currentUser);
      setMentors(mentorsData);
      setAllAssignments(assignmentsData);
      if (teamId) {
        setTeam(teamsData.find((item) => item.id === teamId) || null);
      }
      setLoading(false);
    }

    loadData();
  }, [teamId]);

  const canRequestMentor = !!user && !!team && (team.leader_id === user.id || isAdminUser(user));

  const mentorUsage = useMemo(() => {
    const counts = new Map<string, number>();
    allAssignments.filter((assignment) => assignment.active !== false).forEach((assignment) => {
      counts.set(assignment.mentor_id, (counts.get(assignment.mentor_id) || 0) + 1);
    });
    return counts;
  }, [allAssignments]);

  const filteredMentors = useMemo(() => {
    return mentors.filter((mentor) => {
      const profile = Array.isArray(mentor.profiles) ? mentor.profiles[0] : mentor.profiles;
      const name = profile?.name || "";
      const dept = mentor.department || "";
      const expertiseText = (mentor.expertise || []).join(" ");
      const bioText = mentor.bio || profile?.bio || "";
      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        dept.toLowerCase().includes(search.toLowerCase()) ||
        expertiseText.toLowerCase().includes(search.toLowerCase()) ||
        bioText.toLowerCase().includes(search.toLowerCase());
      const matchesDept = !department || dept === department;
      return matchesSearch && matchesDept;
    });
  }, [department, mentors, search]);

  const handleRequestMentor = async () => {
    if (!team || !selectedMentor) return;
    setSending(true);
    try {
      await MockDB.requestMentor(team.id, selectedMentor.id, note);
      setSelectedMentor(null);
      setNote("");
      alert("Mentor request sent.");
    } catch (err: any) {
      alert(err?.message || "Failed to send mentor request.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col page-shell">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="hero-panel soft-border rounded-3xl p-6 md:p-8 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/10 via-transparent to-[#f97316]/10 pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-300">
                <GraduationCap className="h-3.5 w-3.5 text-[#10b981]" />
                Mentor Directory
              </span>
              <h1 className="text-4xl md:text-5xl font-black text-white mt-4">Find faculty mentors for your SIH team.</h1>
              <p className="text-sm md:text-base text-gray-400 mt-3 max-w-2xl">
                Browse professors and teachers by department, expertise, and availability. Request mentorship directly from your team flow.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/mentors/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea580c] transition-colors"
              >
                Mentor Hub
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {team && (
          <section className="rounded-2xl border border-[#10b981]/20 bg-[#10b981]/5 p-5 text-sm text-green-100 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-bold text-white">Requesting mentor for: {team.name}</div>
              <div className="text-green-100/80 mt-1">You can pick a mentor below and send a request on behalf of your team.</div>
            </div>
            {canRequestMentor ? (
              <span className="px-3 py-1.5 rounded-full bg-[#10b981]/15 border border-[#10b981]/20 text-[#10b981] text-xs font-semibold">
                Team leader access enabled
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/20 text-yellow-300 text-xs font-semibold">
                Switch to the team leader to request mentors
              </span>
            )}
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass glass-hover soft-border rounded-2xl p-5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Mentors</span>
            <div className="text-3xl font-black text-white mt-2">{mentors.length}</div>
          </div>
          <div className="glass glass-hover soft-border rounded-2xl p-5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Active Mentor Assignments</span>
            <div className="text-3xl font-black text-[#10b981] mt-2">{allAssignments.filter((assignment) => assignment.active !== false).length}</div>
          </div>
          <div className="glass glass-hover soft-border rounded-2xl p-5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Ready to Request</span>
            <div className="text-3xl font-black text-[#f97316] mt-2">{team ? 1 : 0}</div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[0.65fr_1.35fr] gap-6">
          <div className="glass glass-hover soft-border rounded-2xl p-5 space-y-4 h-fit">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="h-4 w-4 text-[#f97316]" />
              Filters
            </h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mentor name, bio, expertise..."
              className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316]"
            />
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316]"
            >
              <option value="">All Departments</option>
              {Array.from(new Set(mentors.map((mentor) => mentor.department).filter(Boolean))).map((dept) => (
                <option key={dept as string} value={dept as string}>{dept}</option>
              ))}
            </select>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-xs text-gray-400">
              Choose mentors based on subject expertise, availability, and team fit.
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-52 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : filteredMentors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
                No mentors matched your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMentors.map((mentor) => {
                  const profile = Array.isArray(mentor.profiles) ? mentor.profiles[0] : mentor.profiles;
                  const activeTeams = mentorUsage.get(mentor.id) || 0;
                  const requested = selectedMentor?.id === mentor.id;

                  return (
                    <div key={mentor.id} className="glass glass-hover soft-border rounded-2xl p-5 flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                            {mentor.department || "Department not set"}
                          </span>
                          <h3 className="text-lg font-bold text-white mt-1">{profile?.name || "Faculty Mentor"}</h3>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-3">{mentor.bio || profile?.bio || "Mentor profile not filled out yet."}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center text-[#10b981]">
                          <BadgeCheck className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(mentor.expertise || []).slice(0, 4).map((item) => (
                          <span key={item} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-gray-200">
                            {item}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                        <div className="rounded-xl bg-black/20 border border-white/5 p-3">
                          <div className="text-gray-500">Availability</div>
                          <div className="mt-1 font-semibold">{mentor.available_hours || "Flexible"}</div>
                        </div>
                        <div className="rounded-xl bg-black/20 border border-white/5 p-3">
                          <div className="text-gray-500">Assigned teams</div>
                          <div className="mt-1 font-semibold">{activeTeams}/{mentor.max_teams || 3}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-400">
                        <span className="flex items-center gap-2">
                          <Clock3 className="h-3.5 w-3.5" />
                          {mentor.office_hours || "Office hours not set"}
                        </span>
                        <span className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          {mentor.meeting_link ? "Online / Hybrid" : "On campus"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {mentor.meeting_link && (
                          <a
                            href={mentor.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-gray-200 hover:bg-white/10"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Meet Link
                          </a>
                        )}
                        {team && canRequestMentor && (
                          <button
                            onClick={() => {
                              setSelectedMentor(mentor);
                              setNote(`We would love to have you mentor ${team.name}.`);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f97316] text-white text-xs font-semibold hover:bg-[#ea580c]"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Request Mentor
                          </button>
                        )}
                      </div>

                      {requested && (
                        <div className="rounded-xl border border-[#f97316]/20 bg-[#f97316]/5 p-3 text-xs text-orange-100">
                          Mentor selected. Add a note and send the request.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedMentor && team && canRequestMentor && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass rounded-2xl border border-white/10 p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Request Mentor</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Send a request to {Array.isArray(selectedMentor.profiles) ? selectedMentor.profiles[0]?.name : selectedMentor.profiles?.name || "this mentor"} for {team.name}.
                </p>
              </div>
              <button onClick={() => setSelectedMentor(null)} className="text-gray-400 hover:text-white">×</button>
            </div>

            <div className="space-y-4">
              <textarea
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316]"
                placeholder="Introduce your team, your problem statement, and why you'd like mentorship."
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMentor(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-300 border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={handleRequestMentor}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60"
                >
                  {sending ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
