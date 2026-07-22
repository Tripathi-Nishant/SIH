"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MockDB, Profile, Skill, UserSkill } from "@/lib/db";
import Navbar from "@/components/Navbar";
import { UserCircle, Save, CheckCircle, ArrowLeft, Github, Link as LinkIcon, Briefcase, User as UserIcon, Star } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [rolePreference, setRolePreference] = useState<'member' | 'leader' | 'both'>('both');
  const [gender, setGender] = useState<string>("");
  const [openToInvites, setOpenToInvites] = useState<boolean>(true);
  
  // Basic info (readonly here, editable mostly in onboard or if they need to change it, maybe later)
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState(3);
  const [rollNo, setRollNo] = useState("");

  // Skills
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<{ id: string; proficiency: 'beginner' | 'intermediate' | 'advanced' }[]>([]);

  useEffect(() => {
    async function loadData() {
      const loggedUser = await MockDB.getCurrentUser();
      if (!loggedUser) {
        router.push("/");
        return;
      }
      setUser(loggedUser);
      setName(loggedUser.name || "");
      setBranch(loggedUser.branch || "");
      setYear(loggedUser.year || 3);
      setRollNo(loggedUser.roll_no || "");
      setBio(loggedUser.bio || "");
      setLinkedinUrl(loggedUser.linkedin_url || "");
      setPortfolioUrl(loggedUser.portfolio_url || "");
      setRolePreference(loggedUser.role_preference || "both");
      setGender(loggedUser.gender || "");
      setOpenToInvites(loggedUser.open_to_invites !== false);

      const [skillsData, userSkillsData] = await Promise.all([
        MockDB.getSkills(),
        MockDB.getUserSkills()
      ]);

      setAvailableSkills(skillsData);
      
      const mySkills = userSkillsData.filter(us => us.user_id === loggedUser.id);
      setSelectedSkills(mySkills.map(us => ({
        id: us.skill_id,
        proficiency: (us.proficiency as 'beginner' | 'intermediate' | 'advanced') || 'intermediate'
      })));

      setLoading(false);
    }
    loadData();
  }, [router]);

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev => {
      const idx = prev.findIndex(s => s.id === skillId);
      if (idx >= 0) return prev.filter(s => s.id !== skillId);
      return [...prev, { id: skillId, proficiency: 'intermediate' }];
    });
  };

  const updateSkillProficiency = (skillId: string, level: 'beginner' | 'intermediate' | 'advanced') => {
    setSelectedSkills(prev =>
      prev.map(s => s.id === skillId ? { ...s, proficiency: level } : s)
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSuccess(false);

    try {
      const updatedProfile: Profile = {
        ...user,
        name,
        branch,
        year,
        roll_no: rollNo,
        bio,
        linkedin_url: linkedinUrl,
        portfolio_url: portfolioUrl,
        role_preference: rolePreference,
        gender: (gender as Profile["gender"]) || undefined,
        open_to_invites: openToInvites,
      };

      await MockDB.saveProfile(updatedProfile);

      const dbSkills: Omit<UserSkill, 'id' | 'user_id'>[] = selectedSkills.map(s => ({
        skill_id: s.id,
        proficiency: s.proficiency,
        source: 'self-tagged',
        confidence_score: s.proficiency === 'advanced' ? 85 : s.proficiency === 'intermediate' ? 60 : 35
      }));

      await MockDB.saveUserSkills(user.id, dbSkills);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#060a17] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div className="flex items-center gap-4 border-b border-white/5 pb-6">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <UserCircle className="h-7 w-7 text-[#f97316]" /> Edit Profile
            </h2>
            <p className="text-sm text-gray-400 mt-1">Update your personal info, skills, and matching preferences.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          
          <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <UserIcon className="h-5 w-5 text-blue-400" /> Basic Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Full Name</label>
                <input 
                  type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#f97316]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Roll Number</label>
                <input 
                  type="text" value={rollNo} onChange={(e) => setRollNo(e.target.value)} required
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#f97316]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Branch</label>
                <input 
                  type="text" value={branch} onChange={(e) => setBranch(e.target.value)} required
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#f97316]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Year</label>
                <select 
                  value={year} onChange={(e) => setYear(Number(e.target.value))} required
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#f97316]"
                >
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Bio</label>
              <textarea 
                value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#f97316]"
                placeholder="A short bio about yourself..."
              />
            </div>
          </div>

          <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <Briefcase className="h-5 w-5 text-purple-400" /> Preferences & Links
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Role Preference</label>
                  <select 
                    value={rolePreference} onChange={(e) => setRolePreference(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#f97316]"
                  >
                    <option value="both">Open to both (Leader/Member)</option>
                    <option value="member">Team Member Only</option>
                    <option value="leader">Team Leader Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Gender (Optional)</label>
                  <select 
                    value={gender} onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#f97316]"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Non-binary</option>
                  </select>
                </div>
                
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={openToInvites} 
                      onChange={(e) => setOpenToInvites(e.target.checked)}
                      className="w-4 h-4 rounded bg-black/40 border-white/20 text-[#f97316] focus:ring-[#f97316] focus:ring-offset-0" 
                    />
                    <div className="text-sm font-medium text-white">
                      Open to Invites
                      <p className="text-xs text-gray-500 font-normal mt-0.5">Allow team leaders to find and invite you.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" /> LinkedIn URL
                  </label>
                  <input 
                    type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#f97316]"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" /> Portfolio URL
                  </label>
                  <input 
                    type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#f97316]"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1">
                    <Github className="h-3 w-3" /> GitHub Username
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" value={user.github_username || ""} readOnly disabled
                      className="w-full bg-black/60 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                      placeholder="Not synced"
                    />
                    {user.github_username ? (
                      <span className="px-3 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                        <CheckCircle className="h-3.5 w-3.5" /> Synced
                      </span>
                    ) : (
                      <button type="button" onClick={() => router.push('/onboard?step=2')} className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white whitespace-nowrap transition-colors">
                        Sync
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <Star className="h-5 w-5 text-amber-400" /> My Skills
            </h3>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {availableSkills.map((skill) => {
                const selected = selectedSkills.find(s => s.id === skill.id);
                return (
                  <div key={skill.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/20 hover:bg-black/40 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selected ? 'bg-[#f97316] border-[#f97316]' : 'bg-black/50 border-gray-600'}`}>
                        {selected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <input 
                        type="checkbox" className="hidden" 
                        checked={!!selected} onChange={() => toggleSkill(skill.id)} 
                      />
                      <div>
                        <span className="text-sm font-semibold text-white block">{skill.name}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{skill.category}</span>
                      </div>
                    </label>

                    {selected && (
                      <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                        {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                          <button
                            key={level} type="button"
                            onClick={() => updateSkillProficiency(skill.id, level)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md capitalize transition-colors ${selected.proficiency === level ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit" disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#f97316] to-[#eab308] hover:from-[#ea580c] hover:to-[#ca8a04] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
              ) : success ? (
                <>Saved <CheckCircle className="h-4 w-4" /></>
              ) : (
                <>Save Profile <Save className="h-4 w-4" /></>
              )}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
