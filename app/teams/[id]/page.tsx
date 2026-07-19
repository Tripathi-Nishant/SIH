"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { MockDB, Profile, Team, UserSkill, Skill } from "@/lib/db";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Send, AlertCircle } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TeamDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  
  const [user, setUser] = useState<Profile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [isUserInAnyTeam, setIsUserInAnyTeam] = useState(false);

  // Join pitch note state
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      const activeUser = await MockDB.getCurrentUser();
      setUser(activeUser);
      
      const skillsData = await MockDB.getSkills();
      setSkills(skillsData);

      const userSkillsData = await MockDB.getUserSkills();
      setUserSkills(userSkillsData);

      const teamsData = await MockDB.getTeams();
      const foundTeam = teamsData.find(t => t.id === id);
      
      if (foundTeam) {
        setTeam(foundTeam);
        
        const allMembers = await MockDB.getTeamMembers();
        const teamMems = allMembers
          .filter(m => m.team_id === foundTeam.id)
          .map(m => MockDB.getProfiles().then(profs => profs.find(p => p.id === m.user_id)!));
        
        const resolvedMems = await Promise.all(teamMems);
        setMembers(resolvedMems);

        if (activeUser) {
          const inTeam = allMembers.some(m => m.user_id === activeUser.id);
          setIsUserInAnyTeam(inTeam);
        }
      }
    }
    loadData();
  }, [id]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !team) return;

    setSubmitting(true);
    try {
      await MockDB.sendRequest({
        sender_id: user.id,
        receiver_id: team.leader_id,
        team_id: team.id,
        type: 'join_request',
        pitch_note: pitch || "Hi! I am interested in joining your team. I have matching skills."
      });
      setPitch("");
      alert("Join request successfully submitted to team leader!");
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      alert("Failed to send join request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-[#060a17] flex flex-col justify-center items-center">
        <p className="text-gray-400 text-sm">Team not found.</p>
        <button onClick={() => router.push("/browse")} className="mt-4 text-xs text-[#f97316] font-semibold hover:underline">
          Go back to browse
        </button>
      </div>
    );
  }

  const userSkillsString = (userId: string) => {
    const sIds = userSkills.filter(us => us.user_id === userId).map(us => us.skill_id);
    return sIds.map(sid => skills.find(s => s.id === sid)?.name || "").join(", ");
  };

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
        
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </button>

        <div className="glass p-8 rounded-2xl border border-white/10 space-y-6">
          <div className="flex justify-between items-start border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">
                Active Match Details
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                {team.name}
              </h2>
              <span className="text-[10px] text-gray-400 block mt-1">
                Track: {team.problem_statement_domain}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 text-xs capitalize">
              {team.status}
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="block text-[9px] text-[#f97316] font-bold uppercase tracking-wider">
                SIH Problem Statement
              </span>
              <strong className="block text-white text-sm mt-0.5">
                {team.problem_statement_title}
              </strong>
            </div>

            <div>
              <span className="block text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-2">
                Team Roster ({members.length} of 6)
              </span>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white block">
                        {member.name || "TBA"} {member.id === team.leader_id && "⭐ (Leader)"}
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {member.branch} • Year {member.year}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#10b981] font-semibold">
                      {userSkillsString(member.id)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-2">
                Required Vacancies
              </span>
              <div className="flex flex-wrap gap-2">
                {team.required_skills_json.map((slot, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-red-500/10 text-red-300 border border-red-500/20 text-xs rounded">
                    {slot.role} ({slot.skill})
                  </span>
                ))}
              </div>
            </div>
          </div>

          {user && !isUserInAnyTeam && team.status === 'open' && (
            <div className="pt-6 border-t border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white">Submit Request to Join Squad</h3>
              
              <form onSubmit={handleSendRequest} className="space-y-3">
                <textarea
                  rows={3}
                  required
                  placeholder="Introduce yourself and explain why you're a good fit for this squad..."
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Sending Request..." : "Send Request to Join"}
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {isUserInAnyTeam && (
            <div className="p-3.5 bg-white/5 border border-white/5 rounded-xl text-gray-400 text-xs flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>You are already in a team squad. You must leave your active team before applying to join another.</span>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
