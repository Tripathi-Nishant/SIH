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

  static async updateTeam(team: Team) {
    const { error } = await supabase
      .from("teams")
      .update({
        name: team.name,
        problem_statement_title: team.problem_statement_title,
        problem_statement_domain: team.problem_statement_domain,
        required_skills_json: team.required_skills_json,
        capacity: team.capacity,
        status: team.status,
        visibility: team.visibility,
      })
      .eq("id", team.id);

    if (error) throw new Error(error.message);
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
}
