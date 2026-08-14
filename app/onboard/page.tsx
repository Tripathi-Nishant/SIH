"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MockDB, Profile, Skill, UserSkill } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { Github, FileText, CheckCircle, ArrowRight, ArrowLeft, X, GraduationCap, Link2, Sparkles } from "lucide-react";

function OnboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<Profile | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState(3);
  const [rollNo, setRollNo] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [rolePreference, setRolePreference] = useState<'member' | 'leader' | 'both'>('both');
  const [gender, setGender] = useState<string>("");
  const [openToInvites, setOpenToInvites] = useState<boolean>(true);

  // GitHub integration
  const [githubUser, setGithubUser] = useState("");
  const [githubSynced, setGithubSynced] = useState(false);
  const [githubRepos, setGithubRepos] = useState<string[]>([]);
  const [githubSkills, setGithubSkills] = useState<{ name: string; level: 'beginner' | 'intermediate' | 'advanced' }[]>([]);

  // Resume Upload
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);

  // Manual skills selection
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<{ id: string; proficiency: 'beginner' | 'intermediate' | 'advanced' }[]>([]);

  useEffect(() => {
    async function init() {
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
      setRolePreference(loggedUser.role_preference || "both");
      setGithubUser(loggedUser.github_username || "");
      setGender(loggedUser.gender || "");
      setOpenToInvites(loggedUser.open_to_invites !== false);

      // Check URL query parameters for GitHub sync callback status
      const githubStatus = searchParams.get("github_sync");
      const githubUsername = searchParams.get("username");
      if (githubStatus === "success" && githubUsername) {
        setGithubUser(githubUsername);
        setGithubSynced(true);
        // Load detected skills from Supabase
        const dbSkills = await MockDB.getUserSkills();
        const userSkillsList = dbSkills.filter(us => us.user_id === loggedUser.id && us.source === 'github-verified');
        const activeSkills = await MockDB.getSkills();
        const detected = userSkillsList.map(us => {
          const foundName = activeSkills.find(s => s.id === us.skill_id)?.name || "";
          return { name: foundName, level: us.proficiency };
        });
        setGithubSkills(detected);
        setStep(2); // Keep on integrations step
      } else if (loggedUser.github_username) {
        setGithubSynced(true);
      }

      const skillsData = await MockDB.getSkills();
      setAvailableSkills(skillsData);
    }
    init();
  }, [router, searchParams]);

  const handleSyncGithub = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID?.trim();
      if (!clientId || clientId === "your-github-client-id") {
        throw new Error("GitHub OAuth is not configured. Add NEXT_PUBLIC_GITHUB_CLIENT_ID to the app environment.");
      }

      // The callback verifies a signed state value. Never send the raw user id.
      const stateResponse = await fetch("/api/github/state", { credentials: "include" });
      const stateData = await stateResponse.json().catch(() => ({}));
      if (!stateResponse.ok || !stateData.state) {
        throw new Error(stateData.error || "Could not start GitHub connection.");
      }

      const redirectUri = `${window.location.origin}/api/github-callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        state: stateData.state,
        scope: "read:user,public_repo",
      });
      window.location.assign(`https://github.com/login/oauth/authorize?${params.toString()}`);
    } catch (err) {
      setLoading(false);
      alert(err instanceof Error ? err.message : "Could not connect GitHub.");
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== "application/pdf") {
      alert("Only PDF files are supported for resume keyword parsing.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Resume file size must not exceed 5MB.");
      return;
    }

    setLoading(true);
    setResumeFileName(file.name);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      // Storage RLS expects the first path segment to be the authenticated user id.
      const filePath = `${user.id}/${fileName}`;

      // Upload file to Supabase Storage bucket 'resumes'
      const { data: storageData, error: storageError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: true });

      if (storageError) throw storageError;

      // Extract skills from PDF text
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (!res.ok || result.error) throw new Error(result.error || "Resume parsing failed.");

      setResumeSkills(result.skills || []);
      setResumeUploaded(true);
    } catch (err: any) {
      console.error(err);
      setResumeFileName("");
      alert(`Resume upload failed: ${err instanceof Error ? err.message : "Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev => {
      const idx = prev.findIndex(s => s.id === skillId);
      if (idx >= 0) {
        return prev.filter(s => s.id !== skillId);
      } else {
        return [...prev, { id: skillId, proficiency: 'intermediate' }];
      }
    });
  };

  const updateSkillProficiency = (skillId: string, level: 'beginner' | 'intermediate' | 'advanced') => {
    setSelectedSkills(prev =>
      prev.map(s => s.id === skillId ? { ...s, proficiency: level } : s)
    );
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!name.trim() || !rollNo.trim() || !branch) {
        alert("Please complete Name, Roll Number, and Branch before proceeding.");
        return;
      }
      
      // KIET Roll numbers are typically 13 digits (allowing 10-15 for flexibility)
      if (!/^\d{10,15}$/.test(rollNo.trim())) {
        alert("Roll Number must be between 10 and 15 digits.");
        return;
      }
    }
    setStep(step + 1);
  };

  const handleSaveAndSubmit = async () => {
    if (!user) return;

    const updatedProfile: Profile = {
      ...user,
      name,
      branch,
      year,
      roll_no: rollNo,
      bio,
      github_username: githubUser,
      linkedin_url: linkedinUrl,
      portfolio_url: portfolioUrl,
      role_preference: rolePreference,
      github_verified: githubSynced,
      profile_completeness: 100,
      gender: (gender as Profile["gender"]) || undefined,
      open_to_invites: openToInvites,
    };
    await MockDB.saveProfile(updatedProfile);

    const dbSkills: Omit<UserSkill, 'id' | 'user_id'>[] = [];

    // Add manual selected skills
    selectedSkills.forEach(s => {
      dbSkills.push({
        skill_id: s.id,
        proficiency: s.proficiency,
        source: 'self-tagged',
        confidence_score: s.proficiency === 'advanced' ? 85 : s.proficiency === 'intermediate' ? 60 : 35
      });
    });

    // Add resume parsed skills
    resumeSkills.forEach(rs => {
      const found = availableSkills.find(as => as.name === rs);
      if (found) {
        dbSkills.push({
          skill_id: found.id,
          proficiency: 'intermediate',
          source: 'self-tagged',
          confidence_score: 70
        });
      }
    });

    await MockDB.saveUserSkills(user.id, dbSkills);
    router.push("/dashboard");
  };

  return (
    <div className="max-w-2xl mx-auto z-10 relative">
      <div className="text-center mb-8">
        <span className="text-xs font-bold text-[#f97316] uppercase tracking-wider">SIH 2026 Profile Onboarding</span>
        <h2 className="text-3xl font-extrabold text-white mt-1">Complete Student Profile</h2>
        <p className="text-sm text-gray-400 mt-2">Help leaders and matching engines discover your engineering skills.</p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center text-xs font-semibold text-gray-400 px-1 mb-2">
          <span>Step {step} of 4</span>
          <span>{step === 1 ? "Basic Info" : step === 2 ? "Integrations" : step === 3 ? "Skills Profiling" : "Confirm"}</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#f97316] to-[#10b981] transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="glass p-8 rounded-2xl border border-white/10 shadow-xl">
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#f97316]" /> Basic Academic Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Roll Number</label>
                <input
                  type="text"
                  required
                  placeholder="22002901XXXXX"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f97316] transition-colors"
                >
                  <option value="">Select Branch</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Computer Science (AI/ML)">Computer Science (AI/ML)</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Academic Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f97316] transition-colors"
                >
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Short Bio</label>
              <textarea
                rows={3}
                placeholder="Tell potential team members about yourself, your hackathon goals..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316] transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">LinkedIn Profile (Optional)</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Portfolio URL (Optional)</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="url"
                    placeholder="https://mywebsite.com"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">SIH Team Role Preference</label>
              <div className="grid grid-cols-3 gap-3">
                {(['member', 'leader', 'both'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRolePreference(role)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold capitalize transition-all ${
                      rolePreference === role
                        ? "bg-[#f97316]/20 border-[#f97316] text-[#f97316]"
                        : "bg-[#0a0f1d] border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    {role === 'both' ? 'Looking for Both' : `Looking as ${role}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Gender{" "}
                  <span className="text-gray-500 font-normal">(Optional, self-disclosed)</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f97316] transition-colors"
                >
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other / Non-binary</option>
                </select>
                <p className="text-[10px] text-gray-500 leading-4">
                  Used only to match you with teams seeking to complete their required composition. Never shown on your public profile or used as a search filter by others.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Invite Availability</label>
                <button
                  type="button"
                  onClick={() => setOpenToInvites(!openToInvites)}
                  className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-between ${
                    openToInvites
                      ? "bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]"
                      : "bg-white/5 border-white/10 text-gray-400"
                  }`}
                >
                  <span>{openToInvites ? "Open to team invites" : "Not accepting invites"}</span>
                  <span className={`h-4 w-8 rounded-full transition-colors flex items-center ${openToInvites ? "bg-[#10b981]" : "bg-white/20"}`}>
                    <span className={`h-3 w-3 rounded-full bg-white mx-0.5 transition-transform ${openToInvites ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                </button>
                <p className="text-[10px] text-gray-500 leading-4">
                  Disable this if you are already on a team or do not wish to receive invites.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Github className="h-5 w-5 text-gray-300" /> GitHub & Resume Verified Integrations
            </h3>

            <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Sync GitHub Account</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Import repositories and verify language expertise badges.</p>
                </div>
                {githubSynced ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Synced
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-gray-400">
                    Not Linked
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter GitHub Username"
                  value={githubUser}
                  onChange={(e) => setGithubUser(e.target.value)}
                  disabled={githubSynced}
                  className="flex-1 bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316] transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleSyncGithub}
                  disabled={loading || githubSynced}
                  className="px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {loading ? "Redirecting..." : "Connect OAuth"}
                </button>
              </div>

              {githubSynced && githubSkills.length > 0 && (
                <div className="text-xs space-y-1.5 pt-2 border-t border-white/5">
                  <span className="font-semibold text-gray-300 block">Auto-Detected Skills & Badges:</span>
                  <div className="flex flex-wrap gap-2">
                    {githubSkills.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20 font-medium">
                        {s.name} (GitHub Verified)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Upload Engineering Resume</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Parse skills and experiences automatically using keyword matchers.</p>
                </div>
                {resumeUploaded ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Parsed
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-gray-400">
                    Empty
                  </span>
                )}
              </div>

              <div className="relative border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:border-[#f97316]/50 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleResumeUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-gray-300 block">
                  {resumeUploaded ? resumeFileName : "Click or drag resume PDF file here"}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">PDF up to 5MB</span>
              </div>

              {resumeUploaded && (
                <div className="text-xs space-y-1.5 pt-2 border-t border-white/5">
                  <span className="font-semibold text-gray-300 block">Parsed Skills Found:</span>
                  <div className="flex flex-wrap gap-2">
                    {resumeSkills.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/20 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#f97316]" /> Select Core Competencies & Skills
            </h3>

            <p className="text-xs text-gray-400">
              Self-tag your expert areas to display on your match summary profile card.
            </p>

            <div className="space-y-4">
              <span className="text-xs font-semibold text-gray-300 block">Available Skills List</span>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 border border-white/5 rounded-lg bg-[#0a0f1d]">
                {availableSkills.map((skill) => {
                  const isSelected = selectedSkills.some(s => s.id === skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`px-2.5 py-1 rounded-md text-xs transition-colors flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#f97316] text-white"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {skill.name}
                      {isSelected && <X className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedSkills.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-white/5">
                <span className="text-xs font-semibold text-gray-300 block">Set Proficiency Levels</span>
                <div className="space-y-2">
                  {selectedSkills.map((skillObj) => {
                    const skillName = availableSkills.find(s => s.id === skillObj.id)?.name || "";
                    return (
                      <div key={skillObj.id} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg text-xs">
                        <span className="font-semibold text-white">{skillName}</span>
                        <div className="flex gap-1.5">
                          {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => updateSkillProficiency(skillObj.id, level)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                                skillObj.proficiency === level
                                  ? "bg-[#f97316] text-white"
                                  : "bg-black/20 text-gray-400 hover:text-white"
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center">
            <div className="h-16 w-16 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 rounded-full flex items-center justify-center mx-auto shadow-lg mb-4">
              <CheckCircle className="h-8 w-8" />
            </div>

            <h3 className="text-xl font-bold text-white">All Set, Ready to Match!</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Your profile is completely verified. Your skill tags and GitHub repositories will now feed our matching engine to score team fit parameters.
            </p>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-left space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Student Name:</span>
                <span className="font-semibold text-white">{name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Branch & Year:</span>
                <span className="font-semibold text-white">{branch} (Year {year})</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">GitHub Verified:</span>
                <span className="font-semibold text-white">{githubSynced ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Resume Uploaded:</span>
                <span className="font-semibold text-white">{resumeUploaded ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Preferred Role:</span>
                <span className="font-semibold text-white capitalize">{rolePreference}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <div></div>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              Next Step <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAndSubmit}
              className="px-6 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
            >
              Complete Onboarding <CheckCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#060a17] flex justify-center items-center text-gray-400">
        Loading Onboarding Session...
      </div>
    }>
      <div className="flex-1 min-h-screen bg-[#060a17] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-orange-950/10 blur-[120px] pointer-events-none" />
        <OnboardContent />
      </div>
    </Suspense>
  );
}
