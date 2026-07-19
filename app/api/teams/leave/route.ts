import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const teamId = body.team_id as string;
  if (!teamId) {
    return NextResponse.json({ error: "team_id is required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.team_id !== teamId) {
    return NextResponse.json({ error: "You are not a member of this team" }, { status: 403 });
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, leader_id, name")
    .eq("id", teamId)
    .single();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const isLeader = team.leader_id === user.id;

  if (isLeader) {
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ disbanded: true, message: "Team disbanded successfully" });
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ left: true, message: "You have left the team" });
}

export const dynamic = "force-dynamic";
