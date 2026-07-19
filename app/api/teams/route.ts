import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((profile.profile_completeness ?? 0) < 80) {
    return NextResponse.json(
      { error: "Complete your profile before creating a team" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, problem_statement_title, problem_statement_domain, required_skills_json, visibility } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 });
  }

  const { data: existingMembership } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    return NextResponse.json(
      { error: "You are already in a team. Leave your current team first." },
      { status: 409 }
    );
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      leader_id: user.id,
      name: name.trim(),
      problem_statement_title: problem_statement_title?.trim() || "General SIH Track",
      problem_statement_domain: problem_statement_domain?.trim() || "Software",
      required_skills_json: Array.isArray(required_skills_json) ? required_skills_json : [],
      capacity: 6,
      status: "open",
      visibility: visibility === "private" ? "private" : "public",
    })
    .select()
    .single();

  if (teamError || !team) {
    return NextResponse.json({ error: teamError?.message || "Failed to create team" }, { status: 400 });
  }

  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: user.id,
  });

  if (memberError) {
    await supabase.from("teams").delete().eq("id", team.id);
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  return NextResponse.json({ team });
}

export const dynamic = "force-dynamic";
