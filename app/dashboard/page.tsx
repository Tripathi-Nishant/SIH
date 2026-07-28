"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MockDB, Profile, Team, TeamMember, Request, UserSkill, Skill } from "@/lib/db";
import Navbar from "@/components/Navbar";
import { 
  Users, Award, PlusCircle, Check, X, FileText,
  ExternalLink, AlertTriangle, Info, Trash2,
  ShieldAlert, Flag, Star, Send
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<(Profile & { joined_at: string })[]>([]);
  const [recommendedTeams, setRecommendedTeams] = useState<Team[]>([]);
  const [recommendedStudents, setRecommendedStudents] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [allUserSkills, setAllUserSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);

  // Peer rating flow states
  const [seasonConcluded, setSeasonConcluded] = useState(false);
  const [unratedTeammates, setUnratedTeammates] = useState<Profile[]>([]);
  const [ratingTeammate, setRatingTeammate] = useState<Profile | null>(null);
  const [relScore, setRelScore] = useState(5);
  const [skScore, setSkScore] = useState(5);
  const [cmScore, setCmScore] = useState(5);
  const [rateComment, setRateComment] = useState("");

  // Create Team modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamPs, setNewTeamPs] = useState("");
  const [newTeamDomain, setNewTeamDomain] = useState("");
  const [newTeamRole, setNewTeamRole] = useState("");
  const [newTeamSkill, setNewTeamSkill] = useState("");
  const [reqSlots, setReqSlots] = useState<{ role: string; skill: string; count: number }[]>([]);

  // Team Card Modal state
  const [showCardModal, setShowCardModal] = useState(false);
  const [exportingCard, setExportingCard] = useState(false);

  // Invite member modal state (for leader)
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const [invitePitch, setInvitePitch] = useState("");
  const [inviteTargetSkillId, setInviteTargetSkillId] = useState("");
  const [inviteFillsGender, setInviteFillsGender] = useState(false);

  // Teams that need composition requirement AND match current user's skills
  const [compositionMatchTeams, setCompositionMatchTeams] = useState<Team[]>([]);

  // Report/block modal
  const [reportModal, setReportModal] = useState<{ requestId: string; senderName: string } | null>(null);
  const [reportReason, setReportReason] = useState("");

  const refreshData = async () => {
    setLoading(true);
    const loggedUser = await MockDB.getCurrentUser();
    if (!loggedUser) {
      router.push("/");
      return;
    }
    setUser(loggedUser);

    const profiles = await MockDB.getProfiles();
    const skills = await MockDB.getSkills();
    const userSkills = await MockDB.getUserSkills();
    const teams = await MockDB.getTeams();
    const members = await MockDB.getTeamMembers();
    const reqs = await MockDB.getRequests();

    setAllProfiles(profiles);
    setAllSkills(skills);
    setAllUserSkills(userSkills);

    // Check if user is in a team
    const userMemberRecord = members.find(m => m.user_id === loggedUser.id);
    if (userMemberRecord) {
      const userTeam = teams.find(t => t.id === userMemberRecord.team_id);
      if (userTeam) {
        setTeam(userTeam);
        // Load team members details
        const teamMems = members
          .filter(m => m.team_id === userTeam.id)
          .map(m => {
            const prof = profiles.find(p => p.id === m.user_id);
            return {
              ...prof!,
              joined_at: m.joined_at
            };
          });
        setTeamMembers(teamMems);
      }
    } else {
      setTeam(null);
      setTeamMembers([]);
    }

    // Requests inbox related to this user
    const teamId = userMemberRecord?.team_id;

    const filteredReqs = reqs.filter(r => 
      r.sender_id === loggedUser.id || 
      r.receiver_id === loggedUser.id || 
      (teamId && r.team_id === teamId)
    );
    setRequests(filteredReqs);

    // Matching Engine Recommendations
    if (!userMemberRecord) {
      const mySkillIds = userSkills.filter(us => us.user_id === loggedUser.id).map(us => us.skill_id);
      const matches = teams.filter(t => {
        if (t.status !== 'open') return false;
        return t.required_skills_json.some(slot => {
          const matchedSkill = skills.find(s => s.name === slot.skill);
          return matchedSkill && mySkillIds.includes(matchedSkill.id);
        });
      });
      setRecommendedTeams(matches);

      // ── Composition-targeted discovery (female students only) ──────────────
      // Only shown to students who have self-disclosed as female.
      // Teams shown are those that still have no female member, ranked by skill fit.
      if (loggedUser.gender === 'female') {
        const teamMembersByTeam = new Map<string, string[]>();
        members.forEach(m => {
          const arr = teamMembersByTeam.get(m.team_id) || [];
          arr.push(m.user_id);
          teamMembersByTeam.set(m.team_id, arr);
        });

        const compMatches = teams
          .filter(t => {
            if (t.status !== 'open') return false;
            // Check if team has no female member yet
            const memberIds = teamMembersByTeam.get(t.id) || [];
            const hasFemaleMember = memberIds.some(uid => {
              const p = profiles.find(pr => pr.id === uid);
              return p?.gender === 'female';
            });
            return !hasFemaleMember;
          })
          .map(t => {
            // Score by how many of the team's required skills match this student
            const skillMatches = t.required_skills_json.filter(slot => {
              const matchedSkill = skills.find(s => s.name === slot.skill);
              return matchedSkill && mySkillIds.includes(matchedSkill.id);
            }).length;
            return { team: t, skillMatches };
          })
          .filter(({ skillMatches }) => skillMatches > 0)   // must match at least one skill
          .sort((a, b) => b.skillMatches - a.skillMatches)  // rank by skill overlap desc
          .map(({ team }) => team);

        setCompositionMatchTeams(compMatches);
      }
    } else {
      const myTeam = teams.find(t => t.id === teamId);
      if (myTeam && myTeam.leader_id === loggedUser.id) {
        const neededSkills = myTeam.required_skills_json.map(slot => slot.skill);
        const inTeamUserIds = members.filter(m => m.team_id === myTeam.id).map(m => m.user_id);
        
        const candidates = profiles.filter(p => {
          if (inTeamUserIds.includes(p.id)) return false;
          const isUserInTeam = members.some(m => m.user_id === p.id);
          if (isUserInTeam) return false;

          const pSkillIds = userSkills.filter(us => us.user_id === p.id).map(us => us.skill_id);
          const pSkillNames = pSkillIds.map(sid => skills.find(s => s.id === sid)?.name || "");
          return neededSkills.some(skillName => pSkillNames.includes(skillName));
        });
        setRecommendedStudents(candidates);
      }
    }

    // Post-season peer ratings check
    const concluded = await MockDB.getSeasonConcluded();
    setSeasonConcluded(concluded);
    if (concluded && userMemberRecord) {
      const myTeamId = userMemberRecord.team_id;
      const teammates = members
        .filter(m => m.team_id === myTeamId && m.user_id !== loggedUser.id)
        .map(m => profiles.find(p => p.id === m.user_id))
        .filter((p): p is Profile => !!p);

      const myRatings = await MockDB.getRatingsByRater(loggedUser.id);
      const ratedIds = myRatings.map(r => r.rated_id);
      const unrated = teammates.filter(t => !ratedIds.includes(t.id));
      setUnratedTeammates(unrated);
    } else {
      setUnratedTeammates([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [router]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTeamName) return;

    await MockDB.createTeam({
      leader_id: user.id,
      name: newTeamName,
      problem_statement_title: newTeamPs || "General SIH Track",
      problem_statement_domain: newTeamDomain || "Software",
      required_skills_json: reqSlots,
      capacity: 6,
      status: 'open',
      visibility: 'public'
    });

    setShowCreateModal(false);
    setNewTeamName("");
    setNewTeamPs("");
    setNewTeamDomain("");
    setReqSlots([]);
    await refreshData();
  };

  const handleAddSlot = () => {
    if (!newTeamRole || !newTeamSkill) return;
    setReqSlots(prev => [...prev, { role: newTeamRole, skill: newTeamSkill, count: 1 }]);
    setNewTeamRole("");
    setNewTeamSkill("");
  };

  const handleRemoveSlot = (index: number) => {
    setReqSlots(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleLeaveTeam = async () => {
    if (!user || !team) return;
    if (confirm("Are you sure you want to leave this team?")) {
      await MockDB.leaveOrDisbandTeam(team.id);
      await refreshData();
    }
  };

  const handleDownloadNomination = async () => {
    if (!team) return;

    try {
      setExportingCard(true);
      const blob = await MockDB.exportNominationCard(team.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${team.name.replace(/[^a-z0-9-_]+/gi, "_")}_nomination.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setShowCardModal(false);
    } catch (error: any) {
      alert(error?.message || "Failed to download nomination card.");
    } finally {
      setExportingCard(false);
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ratingTeammate || !team) return;

    await MockDB.submitRating({
      rater_id: user.id,
      rated_id: ratingTeammate.id,
      team_id: team.id,
      season: "SIH 2026",
      reliability_score: relScore,
      skill_score: skScore,
      communication_score: cmScore,
      comment: rateComment
    });

    setRatingTeammate(null);
    setRelScore(5);
    setSkScore(5);
    setCmScore(5);
    setRateComment("");
    await refreshData();
    alert("Peer rating submitted anonymously!");
  };

  const handleRespondRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    await MockDB.respondToRequest(requestId, status);
    await refreshData();
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !team || !inviteUserId) return;

    try {
      await MockDB.sendRequest({
        sender_id: user.id,
        receiver_id: inviteUserId,
        team_id: team.id,
        type: 'invite',
        pitch_note: invitePitch || "We'd love to have you in our SIH team — your skills are a great match for an open slot!",
        fills_gender_requirement: inviteFillsGender,
        target_skill_id: inviteTargetSkillId || undefined,
      });
      setShowInviteModal(false);
      setInviteUserId("");
      setInvitePitch("");
      setInviteTargetSkillId("");
      setInviteFillsGender(false);
      await refreshData();
    } catch (err: any) {
      alert(err?.message || "Failed to send invite.");
    }
  };

  const handleReportOrBlock = async (action: "report" | "block") => {
    if (!reportModal) return;
    if (action === "report" && !reportReason.trim()) {
      alert("Please provide a reason for the report.");
      return;
    }
    try {
      const result = await MockDB.reportOrBlockInvite(
        reportModal.requestId,
        action,
        action === "report" ? reportReason : undefined
      );
      alert(result.message);
      setReportModal(null);
      setReportReason("");
      await refreshData();
    } catch (err: any) {
      alert(err?.message || "Action failed.");
    }
  };

  const getUserSkillsString = (userId: string) => {
    const sIds = allUserSkills.filter(us => us.user_id === userId).map(us => us.skill_id);
    return sIds.map(sid => allSkills.find(s => s.id === sid)?.name || "").join(", ");
  };

  if (!user) return null;

  const isLeader = team && team.leader_id === user.id;

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col page-shell">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {showWelcome && user.profile_completeness === 100 && (
          <div className="surface-card rounded-2xl p-4 flex items-center justify-between text-blue-100">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-blue-500/20 border border-blue-400/20 flex items-center justify-center">
                <Info className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <span className="font-bold block text-sm">Welcome to the SIH Portal!</span>
                <span className="text-xs opacity-80">Your profile is active. You can now create a team or explore squads.</span>
              </div>
            </div>
            <button onClick={() => setShowWelcome(false)} className="text-blue-400 hover:text-blue-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {seasonConcluded && unratedTeammates.length > 0 && (
          <div className="surface-card rounded-2xl p-4 text-purple-100 text-sm space-y-3">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-purple-400" />
              <div>
                <span className="font-bold">Peer Reputation System Active!</span> The season has concluded. Help build our community trust score by rating your teammates.
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {unratedTeammates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setRatingTeammate(t)}
                className="secondary-btn h-8 px-3 py-0 text-xs text-purple-100 border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/15"
                >
                  Rate {t.name || t.kiet_email}
                </button>
              ))}
            </div>
          </div>
        )}

        {user.profile_completeness < 100 && (
          <div className="surface-card rounded-2xl p-4 text-orange-100 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-[#f97316]" />
              <div>
                <span className="font-bold">Your profile is incomplete!</span> Complete onboarding to unlock auto-matched team recommendations.
              </div>
            </div>
            <button
              onClick={() => router.push("/onboard")}
              className="primary-btn h-8 px-3 text-xs"
            >
              Complete Onboarding
            </button>
          </div>
        )}

        <div className="surface-card rounded-3xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="page-title text-[2rem] md:text-[2.35rem]">Student Workspace</h2>
            <p className="page-subtitle text-sm mt-2 max-w-xl">SIH season: active matching engine</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!team ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="primary-btn"
              >
                <PlusCircle className="h-4 w-4" /> Create SIH Team
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowCardModal(true)}
                  className="secondary-btn"
                >
                  <FileText className="h-4 w-4" /> Export Team Card
                </button>
                <button
                  onClick={handleLeaveTeam}
                  className="secondary-btn !border-red-500/20 !text-red-200 !bg-red-500/5 hover:!bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" /> {isLeader ? "Disband Team" : "Leave Team"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-6">
            
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-32 rounded-2xl border border-white/5 bg-white/5"></div>
                <div className="h-64 rounded-2xl border border-white/5 bg-white/5"></div>
              </div>
            ) : team ? (
              <div className="surface-card rounded-2xl overflow-hidden">
                <div className="p-6 bg-white/5 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="section-kicker">My Active Team</span>
                    <h3 className="section-title mt-3">{team.name}</h3>
                    <p className="section-subtitle mt-2">
                      Problem Statement: <span className="text-gray-300 font-medium">{team.problem_statement_title}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/30 capitalize">
                      Status: {team.status}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="section-title text-sm mb-3">Required Skill Slots</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {team.required_skills_json.map((slot, idx) => {
                        const filled = teamMembers.some(m => {
                          const skillIds = allUserSkills.filter(us => us.user_id === m.id).map(us => us.skill_id);
                          const skillNames = skillIds.map(sid => allSkills.find(s => s.id === sid)?.name || "");
                          return skillNames.includes(slot.skill);
                        });

                        return (
                          <div 
                            key={idx} 
                            className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                              filled 
                                ? "bg-[#10b981]/5 border-[#10b981]/20 text-[#10b981]" 
                                : "bg-red-500/5 border-red-500/20 text-red-300"
                            }`}
                          >
                            <div>
                              <span className="block text-xs font-bold">{slot.role}</span>
                              <span className="block text-[10px] opacity-80">Skill needed: {slot.skill}</span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/30">
                              {filled ? "Filled" : "Vacancy"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Composition Requirement Slot (>=1 female member) */}
                    {(() => {
                      const hasFemale = teamMembers.some(m => m.gender === 'female');
                      return (
                        <div
                          className={`mt-3 p-3 rounded-xl border flex items-center justify-between transition-colors ${
                            hasFemale
                              ? "bg-[#10b981]/5 border-[#10b981]/20 text-[#10b981]"
                              : "bg-amber-500/5 border-amber-500/20 text-amber-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            <div>
                              <span className="block text-xs font-bold">Team Composition Rule</span>
                              <span className="block text-[10px] opacity-80">
                                SIH requires at least 1 female member per team
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              hasFemale ? "bg-black/30" : "bg-amber-900/40 animate-pulse"
                            }`}
                          >
                            {hasFemale ? "Fulfilled" : "Required"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <h4 className="section-title text-sm mb-3">Team Squad Members ({teamMembers.length} of 6)</h4>
                    <div className="space-y-3">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-blue-900/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                              {member.name ? member.name.charAt(0) : "S"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white">{member.name || "TBA"}</span>
                                {member.id === team.leader_id && (
                                  <span className="text-[9px] font-bold bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 px-1.5 py-0.5 rounded uppercase">
                                    Leader
                                  </span>
                                )}
                              </div>
                              <span className="block text-[10px] text-gray-400">{member.branch} · Year {member.year}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] text-gray-400 font-semibold">{getUserSkillsString(member.id)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isLeader && (
                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="section-kicker">Matching Unmatched Students</h4>
                        <button onClick={() => setShowInviteModal(true)} className="text-[10px] font-semibold text-blue-400 hover:underline">
                          Manual Invite
                        </button>
                      </div>

                      {recommendedStudents.length === 0 ? (
                        <p className="text-xs text-gray-500">No matching students found on current filters. Try manual invite or search.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {recommendedStudents.slice(0, 4).map((student) => (
                            <div key={student.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-white block">{student.name}</span>
                                <span className="text-[10px] text-gray-400 block">{student.branch} · Year {student.year}</span>
                                <span className="text-[10px] text-[#10b981] font-medium block mt-0.5 truncate max-w-[150px]">
                                  Skills: {getUserSkillsString(student.id)}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setInviteUserId(student.id);
                                  setShowInviteModal(true);
                                }}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-semibold"
                              >
                                Invite
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            ) : (
                    <div className="space-y-6">
                <div>
                  <h3 className="section-title flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#f97316]" /> Recommended Hackathon Teams
                  </h3>
                  <p className="section-subtitle mt-1">Based on matches between your profile skills and active squad vacancy requirements.</p>
                </div>

                {recommendedTeams.length === 0 ? (
                  <div className="empty-state p-8 rounded-2xl text-center">
                    <Info className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No direct matches currently.</p>
                    <p className="text-xs text-gray-500 mt-1">Go to the Browse section to view all public open squads.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendedTeams.map((t) => (
                      <div key={t.id} className="surface-card surface-card-hover p-5 rounded-2xl transition-all flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-bold bg-[#f97316]/10 text-[#f97316] px-1.5 py-0.5 rounded block w-fit">MATCHED SQUAD</span>
                          <h4 className="text-base font-bold text-white mt-2">{t.name}</h4>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{t.problem_statement_title}</p>
                          
                          <div className="mt-4 space-y-2">
                            <span className="text-[10px] font-semibold text-gray-300 block">Vacancies:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {t.required_skills_json.map((slot, idx) => (
                                <span key={idx} className="text-[9px] font-medium px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">
                                  {slot.role} ({slot.skill})
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex justify-between items-center">
                          <button
                            onClick={() => router.push(`/teams/${t.id}`)}
                            className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1"
                          >
                            View details <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* ── Composition-Targeted Discovery (female students only) ──── */}
                {compositionMatchTeams.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <h3 className="section-title flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-400" /> Teams That Need Your Skills + Composition
                      </h3>
                      <p className="section-subtitle mt-1">
                        These open teams match your skills <span className="text-amber-300">and</span> still need to fulfil the mandatory female-member requirement. Your skills are the primary match - you are never just filling a slot.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {compositionMatchTeams.slice(0, 6).map((t) => (
                        <div key={t.id} className="surface-card surface-card-hover p-5 rounded-2xl transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">SKILL + COMPOSITION MATCH</span>
                            </div>
                            <h4 className="text-base font-bold text-white mt-2">{t.name}</h4>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{t.problem_statement_title}</p>

                            <div className="mt-4 space-y-2">
                              <span className="text-[10px] font-semibold text-gray-300 block">Skill Vacancies:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {t.required_skills_json.map((slot, idx) => (
                                  <span key={idx} className="text-[9px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                    {slot.role} ({slot.skill})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 flex justify-between items-center">
                            <button
                              onClick={() => router.push(`/teams/${t.id}`)}
                              className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
                            >
                              View details <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>

          <div className="lg:col-span-4 space-y-6">
            
            {loading ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-32 bg-white/5 rounded-2xl border border-white/5"></div>
                <div className="h-64 bg-white/5 rounded-2xl border border-white/5"></div>
              </div>
            ) : (
              <>
                <div className="surface-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#f97316]/20 border border-[#f97316]/40 flex items-center justify-center text-[#f97316] font-bold">
                  {user.name ? user.name.charAt(0) : "S"}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{user.name || "Set Name"}</h3>
                  <span className="text-[10px] text-gray-400 block">{user.kiet_email}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-white/5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Profile completeness:</span>
                  <span className="font-semibold text-white">{user.profile_completeness}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#10b981]" style={{ width: `${user.profile_completeness}%` }}></div>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs">
                <span className="text-gray-400">Match status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  team ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30" : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                }`}>
                  {team ? "Team Found" : "Looking for Team"}
                </span>
              </div>
            </div>

            <div className="surface-card rounded-2xl overflow-hidden">
              <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                <h4 className="section-kicker">Inbox Notifications</h4>
                <span className="text-[9px] font-bold bg-[#f97316]/20 text-[#f97316] px-1.5 py-0.5 rounded">
                  {requests.filter(r => r.status === 'pending').length} Action Needed
                </span>
              </div>

              <div className="p-4 divide-y divide-white/5 space-y-4 max-h-[350px] overflow-y-auto">
                {requests.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No notifications or requests found.</p>
                ) : (
                  requests.map((req) => {
                    const sender = allProfiles.find(p => p.id === req.sender_id);
                    const receiver = allProfiles.find(p => p.id === req.receiver_id);
                    const isSender = req.sender_id === user.id;

                    return (
                      <div key={req.id} className="pt-3 first:pt-0 space-y-2">
                        <div className="text-xs">
                          {req.type === 'join_request' ? (
                            <span>
                              {isSender ? (
                                <>You requested to join <strong className="text-white">{allProfiles.find(p => p.id === req.receiver_id)?.name || "a team"}</strong></>
                              ) : (
                                <><strong className="text-white">{sender?.name}</strong> requested to join your team</>
                              )}
                            </span>
                          ) : (
                            <span>
                              {isSender ? (
                                <>You invited <strong className="text-white">{receiver?.name}</strong> to join your team</>
                              ) : (
                                <>You received an invitation to join <strong className="text-white">{allProfiles.find(p => p.id === req.sender_id)?.name || "a team"}</strong></>
                              )}
                            </span>
                          )}
                        </div>

                        {req.pitch_note && (
                          <div className="p-2 rounded bg-black/30 border border-white/5 text-[10px] text-gray-400 italic">
                            &quot;{req.pitch_note}&quot;
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-1 text-[10px]">
                          <span className={`font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            req.status === 'pending' ? "bg-yellow-500/10 text-yellow-300" :
                            req.status === 'accepted' ? "bg-[#10b981]/15 text-[#10b981]" :
                            "bg-red-500/10 text-red-300"
                          }`}>
                            {req.status}
                          </span>

                          {req.status === 'pending' && !isSender && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRespondRequest(req.id, 'accepted')}
                                className="p-1 text-[#10b981] hover:bg-[#10b981]/25 border border-[#10b981]/40 rounded"
                                title="Accept"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleRespondRequest(req.id, 'rejected')}
                                className="p-1 text-red-400 hover:bg-red-500/25 border border-red-500/40 rounded"
                                title="Reject"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setReportModal({ requestId: req.id, senderName: sender?.name || "a user" })}
                                className="p-1 text-gray-400 hover:text-red-400 hover:bg-white/10 border border-white/10 hover:border-red-500/40 rounded ml-2"
                                title="Report or Block sender"
                              >
                                <Flag className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            </>
            )}

          </div>

        </div>

      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="surface-card w-full max-w-lg rounded-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-4">Create New SIH Team</h3>
            
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Team ByteMasters"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Problem Statement Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Smart Traffic control"
                    value={newTeamPs}
                    onChange={(e) => setNewTeamPs(e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Domain / Category</label>
                  <select
                    value={newTeamDomain}
                    onChange={(e) => setNewTeamDomain(e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="Software">Software Track</option>
                    <option value="Hardware">Hardware Track</option>
                    <option value="AI/ML">AI/ML Track</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-3">
                <span className="text-xs font-semibold text-white block">Define Needed Vacant Slots</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Role (e.g. Designer)"
                    value={newTeamRole}
                    onChange={(e) => setNewTeamRole(e.target.value)}
                    className="flex-1 bg-[#0a0f1d] border border-white/10 rounded px-2 py-1 text-xs text-white"
                  />
                  <select
                    value={newTeamSkill}
                    onChange={(e) => setNewTeamSkill(e.target.value)}
                    className="flex-1 bg-[#0a0f1d] border border-white/10 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="">Choose Skill</option>
                    {allSkills.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="px-3 py-1 bg-[#10b981] hover:bg-[#059669] text-white rounded text-xs font-bold"
                  >
                    Add
                  </button>
                </div>

                {reqSlots.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {reqSlots.map((s, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-xs text-white">
                        {s.role} ({s.skill})
                        <button type="button" onClick={() => handleRemoveSlot(idx)} className="text-red-400 hover:text-red-650">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg text-xs font-semibold"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="surface-card w-full max-w-md rounded-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2">Send Team Invitation</h3>
            <p className="text-xs text-gray-400 mb-4">Invite students directly by selecting their profile name.</p>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Select Student Candidate</label>
                <select
                  required
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="">Select Candidate</option>
                  {allProfiles
                    .filter(p => p.id !== user.id)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name || p.kiet_email} ({p.branch})</option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Invite pitch note</label>
                <textarea
                  rows={3}
                  value={invitePitch}
                  onChange={(e) => setInvitePitch(e.target.value)}
                  placeholder="Tell the developer why they should join..."
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  Send Invite <Send className="h-3 w-3" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCardModal && team && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#080f25] border-2 border-white/15 rounded-2xl p-8 relative shadow-2xl">
            <div className="flex justify-between items-start border-b-2 border-[#f97316] pb-4 mb-6">
              <div>
                <span className="text-[10px] font-bold text-gray-400 block tracking-widest uppercase">
                  KIET Group of Institutions
                </span>
                <span className="text-[10px] font-bold text-[#f97316] block tracking-wider">
                  Smart India Hackathon 2026 Internal Nomination
                </span>
                <h2 className="text-xl font-black text-white mt-1 uppercase tracking-tight">
                  {team.name}
                </h2>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-0.5 rounded bg-white/10 text-white text-[10px] font-bold border border-white/15 uppercase">
                  Software Track
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                <span className="block text-[9px] text-[#f97316] uppercase font-bold tracking-wider">Problem Statement Details</span>
                <strong className="block text-white text-sm mt-0.5">{team.problem_statement_title}</strong>
                <span className="block text-[10px] text-gray-400 mt-1">Domain: {team.problem_statement_domain}</span>
              </div>

              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-2">Team Roster ({teamMembers.length} Members)</span>
                <div className="grid grid-cols-2 gap-3">
                  {teamMembers.map((member, idx) => (
                    <div key={member.id} className="surface-card rounded-2xl p-2.5 flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-white text-xs block truncate">
                          {idx + 1}. {member.name || "TBA"}
                        </span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">
                          Roll: {member.roll_no}
                        </span>
                        <span className="text-[9px] text-gray-400 block">
                          {member.branch} (Year {member.year})
                        </span>
                      </div>
                      <span className="text-[9px] text-[#10b981] font-semibold mt-2 block truncate">
                        Skills: {getUserSkillsString(member.id)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center text-xs">
              <span className="text-[10px] text-gray-500">Auto-generated via KIET SIH Matching Portal.</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCardModal(false)}
                  className="px-4 py-2 border border-white/10 rounded-lg font-semibold text-gray-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={handleDownloadNomination}
                  disabled={exportingCard}
                  className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" /> {exportingCard ? "Generating..." : "Download PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ratingTeammate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="surface-card w-full max-w-md rounded-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-1">Rate Teammate</h3>
            <p className="text-xs text-gray-400 mb-4">Provide anonymous performance scores for {ratingTeammate.name || ratingTeammate.kiet_email}.</p>

            <form onSubmit={handleRatingSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>Reliability (1-5)</span>
                  <span className="font-semibold text-[#f97316]">{relScore} ⭐</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={relScore}
                  onChange={(e) => setRelScore(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#f97316]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>Technical Skills & Contribution (1-5)</span>
                  <span className="font-semibold text-[#f97316]">{skScore} ⭐</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={skScore}
                  onChange={(e) => setSkScore(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#f97316]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>Communication & Teamwork (1-5)</span>
                  <span className="font-semibold text-[#f97316]">{cmScore} ⭐</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={cmScore}
                  onChange={(e) => setCmScore(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#f97316]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Comments (Optional)</label>
                <textarea
                  rows={3}
                  value={rateComment}
                  onChange={(e) => setRateComment(e.target.value)}
                  placeholder="e.g. Great collaborator, always delivered tasks on time."
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRatingTeammate(null)}
                  className="px-4 py-2 border border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg text-xs font-semibold"
                >
                  Submit Rating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="surface-card w-full max-w-md rounded-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" /> Report or Block User
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Are you receiving unsolicited or inappropriate requests from <strong>{reportModal.senderName}</strong>?
            </p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Reason for reporting (Required for Report)</label>
                <textarea
                  rows={3}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Explain why this request is inappropriate..."
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleReportOrBlock("block")}
                  className="w-full py-2 bg-red-950/40 border border-red-500/30 hover:bg-red-900/50 text-red-300 rounded-lg text-xs font-semibold text-left px-4"
                >
                  <span className="block text-white font-bold mb-0.5">Block {reportModal.senderName}</span>
                  <span className="opacity-80">They won't be able to send you any more requests.</span>
                </button>
                <button
                  onClick={() => handleReportOrBlock("report")}
                  className="w-full py-2 bg-orange-950/40 border border-orange-500/30 hover:bg-orange-900/50 text-orange-300 rounded-lg text-xs font-semibold text-left px-4"
                >
                  <span className="block text-white font-bold mb-0.5">Report {reportModal.senderName} to Admins</span>
                  <span className="opacity-80">Flag this user for admin review. Also blocks them.</span>
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setReportModal(null);
                    setReportReason("");
                  }}
                  className="px-4 py-2 border border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
