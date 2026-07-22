import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminProfile } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("team_id");
  if (!teamId) {
    return NextResponse.json({ error: "team_id is required" }, { status: 400 });
  }

  const { data: team } = await supabase.from("teams").select("id, leader_id").eq("id", teamId).single();
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const isMember =
    team.leader_id === user.id ||
    isAdminProfile(profile) ||
    Boolean(
      (await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle()).data
    );

  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("team_chat_messages")
    .select("id, team_id, sender_id, message, created_at, profiles:sender_id (id, name, avatar_url)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ messages: data || [] });
}

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const teamId = String(body.team_id || "").trim();
  const message = String(body.message || "").trim();

  if (!teamId || !message) {
    return NextResponse.json({ error: "team_id and message are required" }, { status: 400 });
  }

  const { data: team } = await supabase.from("teams").select("id, leader_id").eq("id", teamId).single();
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const isMember =
    team.leader_id === user.id ||
    isAdminProfile(profile) ||
    Boolean(
      (await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle()).data
    );

  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("team_chat_messages")
    .insert({
      team_id: teamId,
      sender_id: user.id,
      message,
    })
    .select("id, team_id, sender_id, message, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Failed to send message" }, { status: 400 });
  }

  return NextResponse.json({ message: data });
}

export const dynamic = "force-dynamic";
