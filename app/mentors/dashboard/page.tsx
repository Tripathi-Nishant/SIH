"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { MockDB, MentorProfile, MentorRequest, Profile, TeamMentor } from "@/lib/db";
import { isAdminUser } from "@/lib/admin";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Link2,
  MessageSquare,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";

export default function MentorDashboardPage() {
  const [user, setUser] = useState<Profile | null>(null);
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [requests, setRequests] = useState<MentorRequest[]>([]);
  const [assignments, setAssignments] = useState<TeamMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const [department, setDepartment] = useState("");
  const [expertise, setExpertise] = useState("");
  const [bio, setBio] = useState("");
  const [availableHours, setAvailableHours] = useState("");
  const [officeHours, setOfficeHours] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [maxTeams, setMaxTeams] = useState(3);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [currentUser, profileData, requestsData, assignmentsData] = await Promise.all([
        MockDB.getCurrentUser(),
        MockDB.getMyMentorProfile(),
        MockDB.getMentorRequests(),
        MockDB.getTeamMentors(),
      ]);

      setUser(currentUser);
      setMentorProfile(profileData);
      setRequests(requestsData);
      setAssignments(assignmentsData);

      const source = profileData;
      setDepartment(source?.department || "");
      setExpertise((source?.expertise || []).join(", "));
      setBio(source?.bio || "");
      setAvailableHours(source?.available_hours || "");
      setOfficeHours(source?.office_hours || "");
      setMeetingLink(source?.meeting_link || "");
      setMaxTeams(source?.max_teams ?? 3);
      setIsActive(source?.is_active ?? true);
      setLoading(false);
    }

    loadData();
  }, []);

  const canUseHub = !!user && isAdminUser(user);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  );

  const acceptedAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.active !== false),
    [assignments]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canUseHub) return;

    setSaving(true);
    try {
      await MockDB.saveMentorProfile({
        department: department.trim() || null,
        expertise: expertise
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        bio: bio.trim() || null,
        available_hours: availableHours.trim() || null,
        office_hours: officeHours.trim() || null,
        meeting_link: meetingLink.trim() || null,
        max_teams: Number.isFinite(Number(maxTeams)) ? Number(maxTeams) : 3,
        is_active: isActive,
      });

      const refreshed = await MockDB.getMyMentorProfile();
      setMentorProfile(refreshed);
      alert("Mentor profile saved.");
    } catch (err: any) {
      alert(err?.message || "Failed to save mentor profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleRespond = async (requestId: string, status: "accepted" | "rejected") => {
    setRespondingId(requestId);
    try {
      await MockDB.respondToMentorRequest(requestId, status);
      const [requestsData, assignmentsData] = await Promise.all([
        MockDB.getMentorRequests(),
        MockDB.getTeamMentors(),
      ]);
      setRequests(requestsData);
      setAssignments(assignmentsData);
    } catch (err: any) {
      alert(err?.message || "Failed to update mentor request.");
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060a17] flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-80 rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
        </main>
      </div>
    );
  }

  if (!canUseHub) {
    return (
      <div className="min-h-screen bg-[#060a17] flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center text-[#f97316]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-black text-white">Mentor Hub</h1>
            <p className="text-sm text-gray-400 max-w-xl mx-auto">
              This area is for faculty mentors and admin users only.
            </p>
            <Link
              href="/mentors"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea580c]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Mentor Directory
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="glass rounded-3xl border border-white/10 p-6 md:p-8 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/10 via-transparent to-[#f97316]/10 pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-300">
                <BookOpen className="h-3.5 w-3.5 text-[#10b981]" />
                Mentor Hub
              </span>
              <h1 className="text-4xl md:text-5xl font-black text-white mt-4">Manage your mentorship load.</h1>
              <p className="text-sm md:text-base text-gray-400 mt-3 max-w-2xl">
                Set your mentoring profile, handle incoming team requests, and keep track of active team assignments.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/mentors"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Directory
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-2xl border border-white/10 p-5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Requests</span>
            <div className="text-3xl font-black text-white mt-2">{pendingRequests.length}</div>
            <div className="text-xs text-gray-400 mt-1">Pending mentorship requests</div>
          </div>
          <div className="glass rounded-2xl border border-white/10 p-5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Active Teams</span>
            <div className="text-3xl font-black text-[#10b981] mt-2">{acceptedAssignments.length}</div>
            <div className="text-xs text-gray-400 mt-1">Teams currently assigned to you</div>
          </div>
          <div className="glass rounded-2xl border border-white/10 p-5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Status</span>
            <div className="text-3xl font-black text-[#f97316] mt-2">{isActive ? "Live" : "Paused"}</div>
            <div className="text-xs text-gray-400 mt-1">Mentor profile availability</div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <form onSubmit={handleSave} className="glass rounded-3xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-white">Mentor Profile</h2>
                <p className="text-xs text-gray-400 mt-1">Keep this updated so teams know how to reach you.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-300">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 accent-[#10b981]"
                />
                Active on directory
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Department</label>
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#10b981]"
                  placeholder="Computer Science"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Maximum Teams</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxTeams}
                  onChange={(e) => setMaxTeams(Number(e.target.value))}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#10b981]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">Expertise</label>
              <input
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#10b981]"
                placeholder="AI, IoT, Product Strategy, Hardware"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">Bio</label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#10b981]"
                placeholder="Tell students what problems you like to mentor."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Available Hours</label>
                <input
                  value={availableHours}
                  onChange={(e) => setAvailableHours(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#10b981]"
                  placeholder="Mon-Fri, 3pm-6pm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Office Hours</label>
                <input
                  value={officeHours}
                  onChange={(e) => setOfficeHours(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#10b981]"
                  placeholder="Room 304, Tue 11-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">Meeting Link</label>
              <input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#10b981]"
                placeholder="https://meet.google.com/..."
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#10b981] text-white text-sm font-semibold hover:bg-[#059669] disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>

          <div className="space-y-6">
            <section className="glass rounded-3xl border border-white/10 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#f97316]" />
                    Incoming Requests
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Accept or reject requests from student teams.</p>
                </div>
                <span className="text-xs text-gray-400">{pendingRequests.length} pending</span>
              </div>

              <div className="space-y-3 mt-4">
                {pendingRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
                    No pending mentor requests right now.
                  </div>
                ) : (
                  pendingRequests.map((request) => {
                    const requester = Array.isArray(request.requester) ? request.requester[0] : request.requester;
                    const team = Array.isArray(request.team) ? request.team[0] : request.team;

                    return (
                      <div key={request.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-bold text-white">{team?.name || "Team request"}</h3>
                            <p className="text-xs text-gray-400 mt-1">
                              {requester?.name || "Student"} requested mentorship.
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[10px] font-semibold text-[#f97316]">
                            Pending
                          </span>
                        </div>

                        <p className="text-xs text-gray-300 whitespace-pre-wrap">
                          {request.note || "No note added."}
                        </p>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={respondingId === request.id}
                            onClick={() => handleRespond(request.id, "accepted")}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#10b981] text-white text-xs font-semibold hover:bg-[#059669] disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={respondingId === request.id}
                            onClick={() => handleRespond(request.id, "rejected")}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-xs font-semibold hover:bg-white/10 disabled:opacity-60"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="glass rounded-3xl border border-white/10 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#10b981]" />
                    Active Assignments
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Teams currently linked to you.</p>
                </div>
                <span className="text-xs text-gray-400">{acceptedAssignments.length} active</span>
              </div>

              <div className="space-y-3 mt-4">
                {acceptedAssignments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
                    No active team assignments yet.
                  </div>
                ) : (
                  acceptedAssignments.map((assignment) => {
                    const team = Array.isArray(assignment.team) ? assignment.team[0] : assignment.team;
                    const mentor = Array.isArray(assignment.mentor) ? assignment.mentor[0] : assignment.mentor;

                    return (
                      <div key={assignment.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-white">{team?.name || "Team"}</h3>
                          <p className="text-xs text-gray-400 mt-1">{team?.problem_statement_title || "Problem statement unavailable"}</p>
                          <p className="text-[10px] text-gray-500 mt-2">
                            Mentor: {mentor?.name || user?.name || "You"}
                          </p>
                        </div>
                        <Link
                          href={team?.id ? `/teams/${team.id}` : "/teams"}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-gray-200 hover:bg-white/10"
                        >
                          Open
                          <Link2 className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#10b981]/20 bg-[#10b981]/5 p-5 text-sm text-green-100">
              Keeping your faculty profile current makes the mentor experience feel like a real program instead of a static demo.
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
