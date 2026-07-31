"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { MockDB, Profile, Skill, Team, TeamMember, TeamMentor, MentorProfile, UserSkill } from "@/lib/db";
import { ArrowLeft, Copy, Gauge, Users, Sparkles, ExternalLink, CheckCircle2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PublicTeamPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [mentor, setMentor] = useState<TeamMentor | null>(null);
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [teamsData, teamMembersData, profilesData, skillsData, userSkillsData] = await Promise.all([
        MockDB.getTeams(),
        MockDB.getTeamMembers(),
        MockDB.getProfiles(),
        MockDB.getSkills(),
        MockDB.getUserSkills(),
      ]);
      const teamMentorsData = await MockDB.getTeamMentors(id);
      const mentorProfilesData = await MockDB.getMentors();

      const foundTeam = teamsData.find((item) => item.id === id) || null;
      setTeam(foundTeam);
      setSkills(skillsData);
      setUserSkills(userSkillsData);
      setMentor(teamMentorsData[0] || null);
      setMentorProfile(
        teamMentorsData[0]
          ? mentorProfilesData.find((item) => item.id === teamMentorsData[0].mentor_id) || null
          : null
      );

      if (foundTeam) {
        const teamMemberProfiles = teamMembersData
          .filter((member) => member.team_id === foundTeam.id)
          .map((member) => profilesData.find((profile) => profile.id === member.user_id))
          .filter((profile): profile is Profile => !!profile);
        setMembers(teamMemberProfiles);
      }

      setLoading(false);
    }

    loadData();
  }, [id]);

  const readiness = useMemo(() => {
    if (!team) return 0;
    const memberRatio = Math.min(members.length / Math.max(team.capacity, 1), 1);
    const slotsRatio = Math.min((team.required_skills_json?.length || 0) / 4, 1);
    const statusBonus = team.status === "open" ? 0.18 : 0.08;
    return Math.round((memberRatio * 0.45 + slotsRatio * 0.37 + statusBonus) * 100);
  }, [members.length, team]);

  const teamSkills = useMemo(() => {
    return (team?.required_skills_json || []).map((slot) => slot.skill).filter(Boolean);
  }, [team]);

  const getUserSkillsString = (userId: string) => {
    const sIds = userSkills.filter((us) => us.user_id === userId).map((us) => us.skill_id);
    return sIds.map((sid) => skills.find((s) => s.id === sid)?.name || "").join(", ");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060a17]">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="h-80 rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
        </main>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#060a17] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <p className="text-gray-400 text-sm">This team profile is unavailable or private.</p>
            <button
              onClick={() => router.push("/teams")}
              className="mt-5 px-4 py-2 rounded-xl bg-[#f97316] text-white text-sm font-semibold"
            >
              Back to Team Finder
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href={`/teams/${team.id}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Team Page
          </Link>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-gray-200 hover:bg-white/10"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Link Copied" : "Copy Share Link"}
            </button>
            <Link
              href={`/teams/${team.id}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f97316] text-white text-xs font-semibold hover:bg-[#ea580c]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Join or View
            </Link>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/8 via-[#0b1020] to-[#111827] p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_30%)] pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-300">
                <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                Public Team Profile
              </span>
              <h1 className="text-4xl md:text-5xl font-black text-white mt-4">{team.name}</h1>
              <p className="text-sm md:text-base text-gray-300 mt-3 max-w-2xl">
                {team.problem_statement_title || "No problem statement added yet."}
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-200">
                  {team.problem_statement_domain}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 text-xs font-semibold text-[#10b981]">
                  {team.status.toUpperCase()}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-xs font-semibold text-[#f97316]">
                  {team.visibility.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-[240px]">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-gray-400">Readiness</div>
                <div className="text-3xl font-black text-white mt-1">{readiness}%</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-gray-400">Members</div>
                <div className="text-3xl font-black text-white mt-1">{members.length}/{team.capacity}</div>
              </div>
            </div>
          </div>
        </section>

        {team.result_published && (team.award_title || team.result_rank) && (
          <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-amber-300">Hackathon achievement</div>
            <h2 className="text-2xl font-black text-white mt-2">{team.award_title || `Rank ${team.result_rank}`}</h2>
            {team.result_rank && <p className="text-sm text-amber-100/70 mt-1">Official result: Rank {team.result_rank}</p>}
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-6">
          <div className="space-y-6">
            <div className="glass rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#f97316]" />
                  Team Roster
                </h2>
                <span className="text-xs text-gray-400">{members.length} live profiles</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
                {members.map((member, index) => (
                  <div key={member.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Member {index + 1}</div>
                        <h3 className="text-sm font-bold text-white mt-1">{member.name || "TBA"}</h3>
                        <p className="text-xs text-gray-400 mt-1">{member.branch} • Year {member.year}</p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center text-[#f97316] text-sm font-black">
                        {(member.name || "S").charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3">Skills: {getUserSkillsString(member.id) || "Not listed"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Gauge className="h-4 w-4 text-[#10b981]" />
                Required Skills
              </h2>
              <div className="flex flex-wrap gap-2 mt-4">
                {teamSkills.length > 0 ? teamSkills.map((skill) => (
                  <span key={skill} className="px-3 py-1.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-xs font-semibold text-[#f97316]">
                    {skill}
                  </span>
                )) : (
                  <span className="text-sm text-gray-400">No requirement slots added yet.</span>
                )}
              </div>
            </div>

            <div className="glass rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#10b981]" />
                Mentor
              </h2>
              {mentor ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {mentorProfile?.profiles && !Array.isArray(mentorProfile.profiles)
                          ? mentorProfile.profiles.name
                          : mentorProfile?.profiles && Array.isArray(mentorProfile.profiles)
                            ? mentorProfile.profiles[0]?.name
                            : "Assigned mentor"}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {mentorProfile?.department || "Department not set"}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 text-[10px] font-semibold text-[#10b981]">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-gray-300">
                    {mentorProfile?.bio || "Mentor bio not available yet."}
                  </p>
                  {mentorProfile?.meeting_link && (
                    <a
                      href={mentorProfile.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 text-xs font-semibold text-[#10b981] hover:bg-[#10b981]/20"
                    >
                      Open Meeting Link
                    </a>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-gray-400">
                  No mentor assigned yet. Teams can request one from the mentor directory.
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="glass rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-bold text-white">Want in?</h2>
              <p className="text-sm text-gray-400 mt-2">
                If this squad fits you, jump to the private team page and request to join.
              </p>
              <Link
                href={`/teams/${team.id}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea580c]"
              >
                Join Team Flow
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-[#10b981]/20 bg-[#10b981]/5 p-6 text-sm text-green-100">
              Public profiles help your squad look more real and make it easier for users to share, evaluate, and compare teams quickly.
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
