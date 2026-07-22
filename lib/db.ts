import { supabase } from "./supabaseClient";
import { SKILL_CATALOG } from "./skills";

export interface Profile {
  id: string;
  kiet_email: string;
  name: string;
  branch: string;
  year: number;
  roll_no: string;
  bio: string;
  github_username: string;
  linkedin_url?: string;
  portfolio_url?: string;
  role_preference: "member" | "leader" | "both";
  profile_completeness: number;
  github_verified?: boolean;
  avatar_url?: string;
  auth_provider?: string;
  role?: "student" | "faculty" | "admin";
  gender?: "male" | "female" | "other";
  open_to_invites?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  proficiency: "beginner" | "intermediate" | "advanced";
  source: "self-tagged" | "github-verified";
  confidence_score: number;
}

export interface Team {
  id: string;
  leader_id: string;
  name: string;
  problem_statement_title: string;
  problem_statement_domain: string;
  required_skills_json: { role: string; skill: string; count: number }[];
  capacity: number;
  status: "open" | "full" | "locked";
  visibility: "public" | "private";
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  joined_at: string;
}

export interface MentorProfile {
  id: string;
  department?: string | null;
  expertise?: string[] | null;
  bio?: string | null;
  available_hours?: string | null;
  office_hours?: string | null;
  meeting_link?: string | null;
  max_teams?: number | null;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
  profiles?: Profile | Profile[] | null;
}

export interface MentorRequest {
  id: string;
  team_id: string;
  requester_id: string;
  mentor_id: string;
  note?: string | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  created_at: string;
  responded_at?: string | null;
  team?: Team | Team[] | null;
  requester?: Profile | Profile[] | null;
  mentor?: Profile | Profile[] | null;
}

export interface TeamMentor {
  id: string;
  team_id: string;
  mentor_id: string;
  assigned_from_request_id?: string | null;
  active?: boolean | null;
  assigned_at?: string;
  team?: Team | Team[] | null;
  mentor?: Profile | Profile[] | null;
}

export interface TeamChatMessage {
  id: string;
  team_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  profiles?: {
    id: string;
    name?: string | null;
    avatar_url?: string | null;
  } | {
    id: string;
    name?: string | null;
    avatar_url?: string | null;
  }[] | null;
}

export interface Request {
  id: string;
  sender_id: string;
  receiver_id: string;
  team_id: string;
  type: "join_request" | "invite";
  status: "pending" | "accepted" | "rejected" | "withdrawn" | "expired";
  pitch_note: string;
  created_at: string;
  responded_at?: string;
  fills_gender_requirement?: boolean;
  target_skill_id?: string;
}

export interface Rating {
  id: string;
  rater_id: string;
  rated_id: string;
  team_id: string;
  season: string;
  reliability_score: number;
  skill_score: number;
  communication_score: number;
  comment?: string;
  created_at: string;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

/** Production data access layer for SIH Team Finder */
export class MockDB {
  static async getCurrentUser(): Promise<Profile | null> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return profile as Profile | null;
  }

  static async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error || !data) return [];
    return data as Profile[];
  }

  static async getSkills(): Promise<Skill[]> {
    const { data, error } = await supabase.from("skills").select("*").order("name");
    if (error || !data?.length) {
      return SKILL_CATALOG.map((s, i) => ({
        id: `fallback-${i}`,
        ...s,
      }));
    }
    return data as Skill[];
  }

  static async getUserSkills(): Promise<UserSkill[]> {
    const { data, error } = await supabase.from("user_skills").select("*");
    if (error || !data) return [];
    return data as UserSkill[];
  }

  static async getTeams(): Promise<Team[]> {
    const { data, error } = await supabase.from("teams").select("*");
    if (error || !data) return [];
    return data as Team[];
  }

  static async getTeamMembers(): Promise<TeamMember[]> {
    const { data, error } = await supabase.from("team_members").select("*");
    if (error || !data) return [];
    return data as TeamMember[];
  }

  static async getRequests(): Promise<Request[]> {
    const { data, error } = await supabase.from("requests").select("*");
    if (error || !data) return [];
    return data as Request[];
  }

  static async getMentors(): Promise<MentorProfile[]> {
    const { data, error } = await supabase
      .from("mentor_profiles")
      .select("*, profiles:profiles(*)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as unknown as MentorProfile[];
  }

  static async getMyMentorProfile(): Promise<MentorProfile | null> {
    const { data, error } = await supabase
      .from("mentor_profiles")
      .select("*, profiles:profiles(*)")
      .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
      .maybeSingle();
    if (error || !data) return null;
    return data as unknown as MentorProfile;
  }

  static async getMentorRequests(): Promise<MentorRequest[]> {
    const { data, error } = await supabase
      .from("mentor_requests")
      .select("*, team:teams(*), requester:profiles!mentor_requests_requester_id_fkey(*), mentor:profiles!mentor_requests_mentor_id_fkey(*)")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as unknown as MentorRequest[];
  }

  static async getTeamMentors(teamId?: string): Promise<TeamMentor[]> {
    let query = supabase
      .from("team_mentors")
      .select("*, team:teams(*), mentor:profiles!team_mentors_mentor_id_fkey(*)")
      .eq("active", true)
      .order("assigned_at", { ascending: false });
    if (teamId) query = query.eq("team_id", teamId);
    const { data, error } = await query;
    if (error || !data) return [];
    return data as unknown as TeamMentor[];
  }

  static async saveMentorProfile(profile: Partial<MentorProfile>) {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const payload = {
      id: userId,
      department: profile.department || null,
      expertise: profile.expertise || [],
      bio: profile.bio || null,
      available_hours: profile.available_hours || null,
      office_hours: profile.office_hours || null,
      meeting_link: profile.meeting_link || null,
      max_teams: profile.max_teams ?? 3,
      is_active: profile.is_active ?? true,
    };

    const { error } = await supabase.from("mentor_profiles").upsert(payload);
    if (error) throw new Error(error.message);
  }

  static async requestMentor(teamId: string, mentorId: string, note?: string) {
    const { request } = await apiRequest<{ request: MentorRequest }>("/api/mentor-requests", {
      method: "POST",
      body: JSON.stringify({ team_id: teamId, mentor_id: mentorId, note }),
    });
    return request;
  }

  static async respondToMentorRequest(requestId: string, status: "accepted" | "rejected" | "withdrawn") {
    return apiRequest<{ request: MentorRequest }>("/api/mentor-requests", {
      method: "PATCH",
      body: JSON.stringify({ request_id: requestId, status }),
    });
  }

  static async getTeamChatMessages(teamId: string): Promise<TeamChatMessage[]> {
    const { data, error } = await supabase
      .from("team_chat_messages")
      .select("id, team_id, sender_id, message, created_at, profiles:sender_id (id, name, avatar_url)")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data as unknown as TeamChatMessage[];
  }

  static async sendTeamChatMessage(teamId: string, message: string): Promise<TeamChatMessage> {
    const { message: sent } = await apiRequest<{ message: TeamChatMessage }>("/api/team-chat", {
      method: "POST",
      body: JSON.stringify({ team_id: teamId, message }),
    });
    return sent;
  }

  static async getReports(): Promise<any[]> {
    const { data, error } = await supabase.from("user_reports").select("*");
    if (error || !data) return [];
    return data;
  }

  static async saveProfile(profile: Profile) {
    await apiRequest<{ profile: Profile }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(profile),
    });
  }

  static async saveUserSkills(userId: string, skills: Omit<UserSkill, "id" | "user_id">[]) {
    await supabase.from("user_skills").delete().eq("user_id", userId);

    if (skills.length === 0) return;

    const toInsert = skills.map((s) => ({
      user_id: userId,
      skill_id: s.skill_id,
      proficiency: s.proficiency,
      source: s.source,
      confidence_score: s.confidence_score,
    }));

    const { error } = await supabase.from("user_skills").insert(toInsert);
    if (error) throw new Error(error.message);
  }

  static async createTeam(team: Omit<Team, "id" | "created_at">): Promise<Team> {
    const { team: created } = await apiRequest<{ team: Team }>("/api/teams", {
      method: "POST",
      body: JSON.stringify(team),
    });
    return created;
  }

  static async updateTeam(teamId: string, updates: Partial<Omit<Team, "id" | "created_at" | "leader_id">>) {
    const { team } = await apiRequest<{ team: Team }>(`/api/teams/${teamId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

    return team;
  }

  static async deleteTeam(teamId: string) {
    return apiRequest<{ message: string }>(`/api/teams/${teamId}`, {
      method: "DELETE",
    });
  }

  static async removeTeamMember(teamId: string, _userId: string) {
    const result = await apiRequest<{ left?: boolean; disbanded?: boolean; message: string }>(
      "/api/teams/leave",
      {
        method: "POST",
        body: JSON.stringify({ team_id: teamId }),
      }
    );

    return result;
  }

  static async leaveOrDisbandTeam(teamId: string) {
    return apiRequest<{ message: string }>("/api/teams/leave", {
      method: "POST",
      body: JSON.stringify({ team_id: teamId }),
    });
  }

  static async exportNominationCard(teamId: string): Promise<Blob> {
    const res = await fetch(`/api/export-nomination?team_id=${encodeURIComponent(teamId)}`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    return await res.blob();
  }

  static async sendRequest(
    request: Omit<Request, "id" | "created_at" | "status">
  ): Promise<Request> {
    const { request: created } = await apiRequest<{ request: Request }>("/api/requests", {
      method: "POST",
      body: JSON.stringify(request),
    });
    return created;
  }

  static async respondToRequest(
    requestId: string,
    status: "accepted" | "rejected" | "withdrawn"
  ) {
    await apiRequest("/api/requests", {
      method: "PATCH",
      body: JSON.stringify({ request_id: requestId, status }),
    });
  }

  static async reportOrBlockInvite(
    requestId: string,
    action: "report" | "block",
    reason?: string
  ): Promise<{ blocked: boolean; reported: boolean; message: string }> {
    return apiRequest("/api/requests/report", {
      method: "POST",
      body: JSON.stringify({ request_id: requestId, action, reason }),
    });
  }

  static async getSeasonConcluded(): Promise<boolean> {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "season_concluded")
      .single();
    if (error || !data) return false;
    return data.value === "true";
  }

  static async setSeasonConcluded(concluded: boolean): Promise<void> {
    const { error } = await supabase
      .from("system_settings")
      .upsert({ key: "season_concluded", value: concluded.toString() });
    if (error) throw new Error(error.message);
  }

  static async submitRating(rating: Omit<Rating, "id" | "created_at">): Promise<void> {
    const { error } = await supabase.from("ratings").insert({
      rater_id: rating.rater_id,
      rated_id: rating.rated_id,
      team_id: rating.team_id,
      season: rating.season,
      reliability_score: rating.reliability_score,
      skill_score: rating.skill_score,
      communication_score: rating.communication_score,
      comment: rating.comment,
    });
    if (error) throw new Error(error.message);
  }

  static async getRatingsByRater(raterId: string): Promise<Rating[]> {
    const { data, error } = await supabase.from("ratings").select("*").eq("rater_id", raterId);
    if (error || !data) return [];
    return data as Rating[];
  }

  static async getAllRatings(): Promise<Omit<Rating, "rater_id">[]> {
    const { data, error } = await supabase.from("student_ratings").select("*");
    if (error || !data) return [];
    return data;
  }

  static subscribeToRequests(userId: string, onChange: () => void) {
    const channel = supabase
      .channel(`requests-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  static subscribeToTeamChat(teamId: string, onChange: () => void) {
    const channel = supabase
      .channel(`team-chat-${teamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_chat_messages", filter: `team_id=eq.${teamId}` },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  static async submitArchivePpt(formData: FormData): Promise<{ id: string; file_url: string; storage_path: string }> {
    const res = await fetch("/api/archive/ppts", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  static async submitArchiveTip(payload: {
    category: string;
    content: string;
    author: string;
    role?: string;
  }): Promise<{ tip: any }> {
    return apiRequest("/api/archive/tips", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  static async upvoteArchivePpt(pptId: string) {
    return apiRequest<{ upvotes: number }>(`/api/archive/ppts/${pptId}/upvote`, {
      method: "POST",
    });
  }

  static async upvoteArchiveTip(tipId: string) {
    return apiRequest<{ upvotes: number }>(`/api/archive/tips/${tipId}/upvote`, {
      method: "POST",
    });
  }

  static async deleteArchivePpt(pptId: string) {
    return apiRequest<{ message: string }>(`/api/archive/ppts/${pptId}`, {
      method: "DELETE",
    });
  }

  static async deleteArchiveTip(tipId: string) {
    return apiRequest<{ message: string }>(`/api/archive/tips/${tipId}`, {
      method: "DELETE",
    });
  }
}
