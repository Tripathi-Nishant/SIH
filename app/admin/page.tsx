"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MockDB, Profile, Team, TeamMember, Skill, UserSkill } from "@/lib/db";
import { isAdminUser } from "@/lib/admin";
import Navbar from "@/components/Navbar";
import { ShieldCheck, BarChart3, AlertCircle, RefreshCw, Mail, Settings } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [seasonConcluded, setSeasonConcluded] = useState(false);

  const loadAdminData = async () => {
    const loggedUser = await MockDB.getCurrentUser();
    if (!isAdminUser(loggedUser)) {
      router.push("/dashboard");
      return;
    }
    setUser(loggedUser);

    const concluded = await MockDB.getSeasonConcluded();
    setSeasonConcluded(concluded);

    const teamsData = await MockDB.getTeams();
    const profilesData = await MockDB.getProfiles();
    const skillsData = await MockDB.getSkills();
    const userSkillsData = await MockDB.getUserSkills();
    const membersData = await MockDB.getTeamMembers();
    const reportsData = await MockDB.getReports();

    setTeams(teamsData);
    setProfiles(profilesData);
    setSkills(skillsData);
    setUserSkills(userSkillsData);
    setMembers(membersData);
    setReports(reportsData);
  };

  useEffect(() => {
    loadAdminData();
  }, [router]);

  const handleNudge = async (studentId: string) => {
    const res = await fetch("/api/admin/nudge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ student_id: studentId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Failed to send nudge email.");
      return;
    }

    alert(data.message || "Nudge sent.");
  };

  const handleToggleSeason = async () => {
    const newVal = !seasonConcluded;
    await MockDB.setSeasonConcluded(newVal);
    setSeasonConcluded(newVal);
  };

  const handleOverrideStatus = async (teamId: string, currentStatus: string) => {
    const allTeams = await MockDB.getTeams();
    const target = allTeams.find(t => t.id === teamId);
    if (target) {
      const nextStatus = currentStatus === 'locked' ? 'open' : 'locked';
      await MockDB.updateTeam(teamId, { status: nextStatus });
      await loadAdminData();
      alert(`Team "${target.name}" status overridden to ${nextStatus}`);
    }
  };

  if (!user) return null;

  // Analytics
  const totalStudentsCount = profiles.length;
  const matchedStudentsCount = new Set(members.map(m => m.user_id)).size;
  const unmatchedStudentsCount = totalStudentsCount - matchedStudentsCount;
  const totalTeamsCount = teams.length;

  const maleCount = profiles.filter(p => p.gender === 'male').length;
  const femaleCount = profiles.filter(p => p.gender === 'female').length;

  let teamsMissingFemale = 0;
  teams.forEach(t => {
    const teamMembers = members.filter(m => m.team_id === t.id);
    const hasFemale = teamMembers.some(tm => {
      const p = profiles.find(pr => pr.id === tm.user_id);
      return p?.gender === 'female';
    });
    if (!hasFemale && t.status === 'open') {
      teamsMissingFemale++;
    }
  });

  const flaggedInvitesCount = reports.length;

  const skillCountMap: { [key: string]: number } = { Frontend: 0, Backend: 0, ML: 0, Database: 0, Design: 0 };
  userSkills.forEach(us => {
    const category = skills.find(s => s.id === us.skill_id)?.category;
    if (category && skillCountMap[category] !== undefined) {
      skillCountMap[category] += 1;
    }
  });

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div className="flex justify-between items-center border-b border-white/5 pb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-[#eab308] flex items-center gap-2">
              <ShieldCheck className="h-7 w-7" /> Admin Analytics Panel
            </h2>
            <p className="text-xs text-gray-400 mt-1">Official faculty dashboard for Smart India Hackathon cohort mapping</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSeason}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                seasonConcluded 
                  ? "bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20" 
                  : "bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20"
              }`}
            >
              Season: {seasonConcluded ? "Concluded 🔒" : "Active 🟢"}
            </button>
            <button
              onClick={loadAdminData}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Refresh analytics data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass p-5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-gray-400 block tracking-wider uppercase">Total Registered</span>
            <span className="text-3xl font-black text-white block mt-1">{totalStudentsCount}</span>
            <p className="text-[10px] text-gray-500 mt-1">KIET verified accounts</p>
          </div>

          <div className="glass p-5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-gray-400 block tracking-wider uppercase">Formed Teams</span>
            <span className="text-3xl font-black text-[#f97316] block mt-1">{totalTeamsCount}</span>
            <p className="text-[10px] text-gray-500 mt-1">Active registered squads</p>
          </div>

          <div className="glass p-5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-[#10b981] block tracking-wider uppercase">Matched Students</span>
            <span className="text-3xl font-black text-[#10b981] block mt-1">{matchedStudentsCount}</span>
            <p className="text-[10px] text-gray-500 mt-1">Currently in a team</p>
          </div>

          <div className="glass p-5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-red-400 block tracking-wider uppercase">Unmatched Pool</span>
            <span className="text-3xl font-black text-red-400 block mt-1">{unmatchedStudentsCount}</span>
            <p className="text-[10px] text-gray-500 mt-1">Need pairing assistance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass p-5 rounded-2xl border border-blue-500/20 text-blue-200">
             <h3 className="text-sm font-bold flex items-center gap-2">
                Gender Ratio
             </h3>
             <div className="mt-3 flex items-center gap-4">
                <div>
                   <span className="text-2xl font-black text-white">{femaleCount}</span>
                   <span className="text-[10px] text-blue-300 block">Female</span>
                </div>
                <div className="h-8 w-px bg-blue-500/30"></div>
                <div>
                   <span className="text-2xl font-black text-white">{maleCount}</span>
                   <span className="text-[10px] text-blue-300 block">Male</span>
                </div>
             </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-amber-500/20 text-amber-200">
             <h3 className="text-sm font-bold flex items-center gap-2">
                Composition Rule
             </h3>
             <div className="mt-3">
                 <span className="text-2xl font-black text-white">{teamsMissingFemale}</span>
                 <span className="text-[10px] text-amber-300 block">Teams missing female member</span>
             </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-red-500/20 text-red-200">
             <h3 className="text-sm font-bold flex items-center gap-2">
                Moderation Alerts
             </h3>
             <div className="mt-3">
                 <span className="text-2xl font-black text-white">{flaggedInvitesCount}</span>
                 <span className="text-[10px] text-red-300 block">Reported/flagged invites</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-5 space-y-6">
            <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#f97316]" /> Cohort Skill-Gap Analytics
              </h3>

              <div className="space-y-4">
                {Object.keys(skillCountMap).map((skillName) => {
                  const val = skillCountMap[skillName];
                  const total = Object.values(skillCountMap).reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((val / total) * 100);

                  return (
                    <div key={skillName} className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-gray-300">{skillName} expertise</span>
                        <span className="text-[#f97316]">{pct}% ({val})</span>
                      </div>
                      <div className="h-2 w-full bg-white/15 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#f97316] to-[#eab308]" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-xl bg-orange-950/20 border border-orange-500/20 text-orange-200 text-xs flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Insight:</strong> Designer and Database nodes are slightly underrepresented this cohort. Nudge unmatched students to pick design tasks.
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="glass p-6 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-300" /> Administrative Override Roster
              </h3>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {teams.map((t) => {
                  const size = members.filter(m => m.team_id === t.id).length;
                  return (
                    <div key={t.id} className="p-3.5 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <strong className="block text-white text-sm">{t.name}</strong>
                        <span className="block text-gray-400 text-[10px] mt-0.5">
                          Problem: {t.problem_statement_title}
                        </span>
                        <span className="block text-gray-500 text-[10px]">
                          Capacity: {size} / {t.capacity} • Status: <strong className="text-white capitalize">{t.status}</strong>
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOverrideStatus(t.id, t.status)}
                          className="px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded text-[10px] font-semibold text-white"
                        >
                          {t.status === 'locked' ? 'Unlock Status' : 'Lock Capacity'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                <span className="text-xs font-bold text-white block">Unmatched Student Roster</span>
                <div className="space-y-2">
                  {profiles
                    .filter(p => !members.some(m => m.user_id === p.id))
                    .map((student) => (
                      <div key={student.id} className="p-2.5 bg-white/5 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-white block">{student.name || student.kiet_email}</span>
                          <span className="text-[10px] text-gray-400 block">{student.branch}</span>
                        </div>
                        <button
                          onClick={() => handleNudge(student.id)}
                          className="px-2 py-1 bg-[#f97316] text-white rounded text-[10px] font-semibold flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" /> Send Match Nudge
                        </button>
                      </div>
                    ))}
                </div>
              </div>

            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
