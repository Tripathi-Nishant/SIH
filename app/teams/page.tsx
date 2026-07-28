"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { MockDB, Profile, Team, Skill, UserSkill, TeamMember } from "@/lib/db";
import { getSavedTeams, isTeamSaved, toggleSavedTeam } from "@/lib/shortlist";
import { Search, Users, Sparkles, ArrowRight, ShieldCheck, Bookmark, BookmarkCheck, Gauge } from "lucide-react";

export default function TeamFinderPage() {
  const [user, setUser] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [savedTeams, setSavedTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [currentUser, teamsData, skillsData, userSkillsData, membersData] = await Promise.all([
        MockDB.getCurrentUser(),
        MockDB.getTeams(),
        MockDB.getSkills(),
        MockDB.getUserSkills(),
        MockDB.getTeamMembers(),
      ]);

      setUser(currentUser);
      setTeams(teamsData.filter((team) => team.status === "open" || team.status === "locked"));
      setSkills(skillsData);
      setUserSkills(userSkillsData);
      setMembers(membersData);
      if (currentUser) {
        setSavedTeams(getSavedTeams(currentUser.id));
      }
      setLoading(false);
    }

    loadData();
  }, []);

  const getTeamSkills = (team: Team) =>
    team.required_skills_json
      .map((slot) => slot.skill)
      .filter(Boolean)
      .slice(0, 4);

  const getMemberCount = (teamId: string) => members.filter((m) => m.team_id === teamId).length;

  const getSkillOverlap = (team: Team) => {
    if (!user) return 0;
    const mySkillIds = userSkills.filter((s) => s.user_id === user.id).map((s) => s.skill_id);
    const mySkillNames = mySkillIds.map((id) => skills.find((skill) => skill.id === id)?.name).filter(Boolean) as string[];
    return team.required_skills_json.filter((slot) => mySkillNames.includes(slot.skill)).length;
  };

  const getReadinessScore = (team: Team) => {
    const memberCount = getMemberCount(team.id);
    const skillSlots = team.required_skills_json.length;
    const filledRatio = Math.min(memberCount / Math.max(team.capacity, 1), 1);
    const skillRatio = skillSlots === 0 ? 0.35 : Math.min(skillSlots / 4, 1);
    const statusBoost = team.status === "open" ? 0.15 : 0.05;
    return Math.round((filledRatio * 0.45 + skillRatio * 0.4 + statusBoost) * 100);
  };

  const handleToggleSave = (teamId: string) => {
    if (!user) return;
    const nowSaved = toggleSavedTeam(user.id, teamId);
    setSavedTeams(getSavedTeams(user.id));
    return nowSaved;
  };

  const featuredTeams = [...teams]
    .map((team) => ({ team, overlap: getSkillOverlap(team) }))
    .sort((a, b) => b.overlap - a.overlap || getMemberCount(a.team.id) - getMemberCount(b.team.id))
    .map((item) => item.team);

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col page-shell">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="hero-panel soft-border rounded-3xl p-6 md:p-8 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f97316]/10 via-transparent to-[#10b981]/10 pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-300">
              <ShieldCheck className="h-3.5 w-3.5 text-[#10b981]" />
              Team Finder
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-white mt-4 max-w-2xl">
              Find a real SIH squad, not a demo placeholder.
            </h1>
            <p className="text-sm md:text-base text-gray-400 mt-3 max-w-2xl">
              Browse active teams, check required skills, and jump into a real team detail page when you find a match.
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea580c] transition-colors"
              >
                <Search className="h-4 w-4" />
                Browse Teams
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-200 text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                <Users className="h-4 w-4" />
                Team Dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass glass-hover soft-border rounded-2xl p-5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Open Teams</span>
            <div className="text-3xl font-black text-white mt-2">{teams.filter((team) => team.status === "open").length}</div>
          </div>
          <div className="glass glass-hover soft-border rounded-2xl p-5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Locked Teams</span>
            <div className="text-3xl font-black text-[#10b981] mt-2">{teams.filter((team) => team.status === "locked").length}</div>
          </div>
          <div className="glass glass-hover soft-border rounded-2xl p-5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Matching Hint</span>
            <div className="text-sm text-gray-300 mt-2">
              We rank teams by how many of your skills match their required slots.
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recommended Teams</h2>
            <span className="text-xs text-gray-400">{loading ? "Loading..." : `${featuredTeams.length} active squads`}</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-44 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : featuredTeams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
              No teams are open right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredTeams.slice(0, 8).map((team) => {
                const memberCount = getMemberCount(team.id);
                const overlap = getSkillOverlap(team);
                const skillsList = getTeamSkills(team);
                const readiness = getReadinessScore(team);
                const saved = user ? isTeamSaved(user.id, team.id) : false;

                return (
                  <div key={team.id} className="glass glass-hover soft-border rounded-2xl p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                          {team.problem_statement_domain}
                        </span>
                        <h3 className="text-lg font-bold text-white mt-1">{team.name}</h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{team.problem_statement_title}</p>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-gray-300">
                        {memberCount}/{team.capacity}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {skillsList.length > 0 ? (
                        skillsList.map((skill) => (
                          <span key={skill} className="px-2 py-1 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[10px] font-semibold text-[#f97316]">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">No skill slots added yet</span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 flex items-center gap-2">
                          <Gauge className="h-3.5 w-3.5 text-[#10b981]" />
                          Readiness Score
                        </span>
                        <span className="text-white font-semibold">{readiness}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#f97316] via-yellow-400 to-[#10b981]"
                          style={{ width: `${readiness}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="text-xs text-gray-400">
                        Skill overlap: <span className="text-white font-semibold">{overlap}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {user && (
                          <button
                            onClick={() => handleToggleSave(team.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-gray-200 hover:bg-white/10 transition-colors"
                          >
                            {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-[#10b981]" /> : <Bookmark className="h-3.5 w-3.5" />}
                            {saved ? "Saved" : "Save"}
                          </button>
                        )}
                        <Link
                          href={`/teams/${team.id}`}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-gray-200 hover:bg-white/10 transition-colors"
                        >
                          View Team <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
