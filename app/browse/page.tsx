"use client";

import { useEffect, useState } from "react";
import { MockDB, Profile, Team, Skill, UserSkill, Rating, TeamMember } from "@/lib/db";
import Navbar from "@/components/Navbar";
import { getSavedStudents, getSavedTeams, isStudentSaved, isTeamSaved, toggleSavedStudent, toggleSavedTeam } from "@/lib/shortlist";
import { Search, ShieldCheck, Mail, Send, ExternalLink, Info, Award, Bookmark, BookmarkCheck } from "lucide-react";

export default function BrowsePage() {
  const [user, setUser] = useState<Profile | null>(null);
  const [tab, setTab] = useState<'teams' | 'students'>('teams');
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [ratings, setRatings] = useState<Omit<Rating, 'rater_id'>[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  // Request state
  const [activeReqTeamId, setActiveReqTeamId] = useState<string | null>(null);
  const [reqPitch, setReqPitch] = useState("");
  const [activeInviteStudentId, setActiveInviteStudentId] = useState<string | null>(null);
  const [invitePitch, setInvitePitch] = useState("");
  const [savedTeams, setSavedTeams] = useState<string[]>([]);
  const [savedStudents, setSavedStudents] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    const currentUser = await MockDB.getCurrentUser();
    setUser(currentUser);
    
    const teamsData = await MockDB.getTeams();
    const studentsData = await MockDB.getProfiles();
    const skillsData = await MockDB.getSkills();
    const userSkillsData = await MockDB.getUserSkills();
    const ratingsData = await MockDB.getAllRatings();
    const membersData = await MockDB.getTeamMembers();

    setTeams(teamsData);
    setStudents(studentsData);
    setSkills(skillsData);
    setUserSkills(userSkillsData);
    setRatings(ratingsData);
    setMembers(membersData);
    if (currentUser) {
      setSavedTeams(getSavedTeams(currentUser.id));
      setSavedStudents(getSavedStudents(currentUser.id));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleJoinRequest = async (teamId: string) => {
    if (!user) return;
    await MockDB.sendRequest({
      sender_id: user.id,
      receiver_id: "",
      team_id: teamId,
      type: 'join_request',
      pitch_note: reqPitch || `Hi! I want to join your team. I have skills that match your requirements.`
    });
    setActiveReqTeamId(null);
    setReqPitch("");
    await loadData();
    alert("Join request sent successfully!");
  };

  const handleInviteRequest = async (studentId: string) => {
    if (!user) return;
    const members = await MockDB.getTeamMembers();
    const userTeamRecord = members.find(m => m.user_id === user.id);
    if (!userTeamRecord) {
      alert("You need to create a team first before sending invites!");
      return;
    }

    await MockDB.sendRequest({
      sender_id: user.id,
      receiver_id: studentId,
      team_id: userTeamRecord.team_id,
      type: 'invite',
      pitch_note: invitePitch || `Hey! We'd love to invite you to our team. Check our profile.`
    });
    setActiveInviteStudentId(null);
    setInvitePitch("");
    await loadData();
    alert("Invitation sent successfully!");
  };

  const getUserSkillsString = (userId: string) => {
    const sIds = userSkills.filter(us => us.user_id === userId).map(us => us.skill_id);
    return sIds.map(sid => skills.find(s => s.id === sid)?.name || "").join(", ");
  };

  const checkGithubVerified = (userId: string) => {
    return userSkills.some(us => us.user_id === userId && us.source === 'github-verified');
  };

  const handleToggleTeamSave = (teamId: string) => {
    if (!user) return;
    toggleSavedTeam(user.id, teamId);
    setSavedTeams(getSavedTeams(user.id));
  };

  const handleToggleStudentSave = (studentId: string) => {
    if (!user) return;
    toggleSavedStudent(user.id, studentId);
    setSavedStudents(getSavedStudents(user.id));
  };

  const filteredTeams = teams.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.problem_statement_title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSkill = !selectedSkill || t.required_skills_json.some(s => s.skill === selectedSkill);

    return matchesSearch && matchesSkill;
  });

  const filteredStudents = students.filter(s => {
    if (s.id === user?.id) return false;

    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.bio.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBranch = !selectedBranch || s.branch === selectedBranch;
    
    const matchesYear = !selectedYear || s.year.toString() === selectedYear;

    const pSkillIds = userSkills.filter(us => us.user_id === s.id).map(us => us.skill_id);
    const pSkillNames = pSkillIds.map(sid => skills.find(sk => sk.id === sid)?.name || "");
    const matchesSkill = !selectedSkill || pSkillNames.includes(selectedSkill);

    return matchesSearch && matchesBranch && matchesYear && matchesSkill;
  });

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div>
          <h2 className="text-2xl font-extrabold text-white">Discovery Portal</h2>
          <p className="text-xs text-gray-400 mt-1">Search active squads or discover developer profiles looking to match.</p>
        </div>

        <div className="flex border-b border-white/10">
          <button
            onClick={() => { setTab('teams'); setSearchQuery(""); }}
            className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              tab === 'teams'
                ? "border-b-2 border-[#f97316] text-[#f97316]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Find Open Teams
          </button>
          <button
            onClick={() => { setTab('students'); setSearchQuery(""); }}
            className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              tab === 'students'
                ? "border-b-2 border-[#f97316] text-[#f97316]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Find Student Candidates
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={tab === 'teams' ? "Search team name, PS..." : "Search name, bio..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316]"
            />
          </div>

          <div>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="">Filter by Skill Needed</option>
              {skills.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {tab === 'students' && (
            <>
              <div>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Filter by Branch</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Computer Science (AI/ML)">Computer Science (AI/ML)</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                </select>
              </div>

              <div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Filter by Academic Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse border border-white/5"></div>
            ))}
          </div>
        ) : tab === 'teams' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTeams.length === 0 ? (
              <div className="md:col-span-2 text-center text-gray-500 py-12 bg-white/5 rounded-xl border border-white/5">
                <Info className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                No team squads found matching the filters.
              </div>
            ) : (
              filteredTeams.map((team) => (
                <div key={team.id} className="glass p-6 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-base font-bold text-white">{team.name}</h4>
                      <span className="text-[10px] font-bold bg-blue-900/30 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded capitalize">
                        {team.problem_statement_domain}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      <strong className="text-gray-300">Problem Statement:</strong> {team.problem_statement_title}
                    </p>

                    <div className="mt-4 space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Vacancies needed:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {team.required_skills_json.map((slot, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-300 border border-red-500/20">
                            {slot.role} ({slot.skill})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[10px] text-gray-400">
                      Team Status: <strong className="text-white capitalize">{team.status}</strong>
                    </span>

                    {activeReqTeamId === team.id ? (
                      <div className="w-full space-y-2 pt-2">
                        <textarea
                          rows={2}
                          value={reqPitch}
                          onChange={(e) => setReqPitch(e.target.value)}
                          placeholder="Introduce yourself..."
                          className="w-full bg-[#0a0f1d] border border-white/10 rounded px-2 py-1.5 text-xs text-white resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setActiveReqTeamId(null)}
                            className="px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleJoinRequest(team.id)}
                            className="px-3 py-1 bg-[#f97316] text-white rounded text-[10px] font-semibold"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {user && (
                          <button
                            onClick={() => handleToggleTeamSave(team.id)}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 border border-white/10"
                          >
                            {isTeamSaved(user.id, team.id) ? <BookmarkCheck className="h-3 w-3 text-[#10b981]" /> : <Bookmark className="h-3 w-3" />}
                            {savedTeams.includes(team.id) ? "Saved" : "Save"}
                          </button>
                        )}
                        {user && (
                          <button
                            onClick={() => setActiveReqTeamId(team.id)}
                            className="px-3 py-1.5 bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                          >
                            Request to Join <Send className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredStudents.length === 0 ? (
              <div className="md:col-span-3 text-center text-gray-500 py-12 bg-white/5 rounded-xl border border-white/5">
                <Info className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                No student profiles found matching the filters.
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isVerified = checkGithubVerified(student.id);
                
                const studentRatings = ratings.filter(r => r.rated_id === student.id);
                const ratingCount = studentRatings.length;
                
                let avgRating = 0;
                let isVerifiedContributor = false;
                
                if (ratingCount > 0) {
                  const totalSum = studentRatings.reduce((sum, r) => sum + (r.reliability_score + r.skill_score + r.communication_score) / 3, 0);
                  avgRating = totalSum / ratingCount;
                  
                  const uniqueSeasons = Array.from(new Set(studentRatings.map(r => r.season)));
                  isVerifiedContributor = avgRating >= 4.0 && (uniqueSeasons.length >= 2 || (uniqueSeasons.length >= 1 && process.env.NODE_ENV === 'development'));
                }

                // Get past teams history
                const studentMembers = members.filter(m => m.user_id === student.id);
                const pastTeams = studentMembers.map(m => {
                  const t = teams.find(team => team.id === m.team_id);
                  return t ? {
                    name: t.name,
                    problem: t.problem_statement_title,
                    domain: t.problem_statement_domain
                  } : null;
                }).filter((t): t is { name: string; problem: string; domain: string } => t !== null);

                return (
                  <div key={student.id} className="glass p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-8 rounded-full bg-blue-900/20 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-sm">
                          {student.name ? student.name.charAt(0) : "S"}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isVerified && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25 flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" /> Verified GitHub
                            </span>
                          )}
                          {ratingCount >= 3 && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                              ⭐ {avgRating.toFixed(1)} / 5.0 ({ratingCount} reviews)
                            </span>
                          )}
                          {isVerifiedContributor && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25 flex items-center gap-1">
                              <Award className="h-3 w-3" /> Verified Contributor
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <h4 className="text-sm font-bold text-white">{student.name || "TBA"}</h4>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{student.branch} • Year {student.year}</span>
                      </div>

                      <p className="text-xs text-gray-400 mt-2 line-clamp-2 italic">
                        &quot;{student.bio || "No bio added."}&quot;
                      </p>

                      <div className="mt-3 space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">Expertise tags:</span>
                        <span className="text-[10px] text-white block truncate">{getUserSkillsString(student.id) || "None"}</span>
                      </div>

                      {pastTeams.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                          <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">Past SIH Participation:</span>
                          <div className="space-y-1">
                            {pastTeams.map((pt, idx) => (
                              <div key={idx} className="text-[10px] text-gray-300">
                                <strong>{pt.name}</strong> ({pt.domain}) - <span className="text-gray-400">{pt.problem}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/5 flex justify-end">
                      {activeInviteStudentId === student.id ? (
                        <div className="w-full space-y-2 pt-2">
                          <textarea
                            rows={2}
                            value={invitePitch}
                            onChange={(e) => setInvitePitch(e.target.value)}
                            placeholder="Write an invitation note..."
                            className="w-full bg-[#0a0f1d] border border-white/10 rounded px-2 py-1.5 text-xs text-white resize-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setActiveInviteStudentId(null)}
                              className="px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleInviteRequest(student.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-semibold"
                            >
                              Send Invite
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {user && (
                            <button
                              onClick={() => handleToggleStudentSave(student.id)}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 border border-white/10"
                            >
                              {isStudentSaved(user.id, student.id) ? <BookmarkCheck className="h-3 w-3 text-[#10b981]" /> : <Bookmark className="h-3 w-3" />}
                              {savedStudents.includes(student.id) ? "Saved" : "Save"}
                            </button>
                          )}
                          {user && (
                            <button
                              onClick={() => setActiveInviteStudentId(student.id)}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                            >
                              Invite to Team <Mail className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </main>
    </div>
  );
}
