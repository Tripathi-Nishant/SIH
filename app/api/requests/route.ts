import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { receiver_id, team_id, type, pitch_note } = body;

  if (!team_id || !type || !["join_request", "invite"].includes(type)) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, leader_id, status, capacity")
    .eq("id", team_id)
    .single();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (team.status !== "open") {
    return NextResponse.json({ error: "Team is not accepting requests" }, { status: 409 });
  }

  const { count: memberCount } = await supabase
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", team_id);

  if ((memberCount ?? 0) >= team.capacity) {
    return NextResponse.json({ error: "Team is already full" }, { status: 409 });
  }

  let resolvedReceiverId = receiver_id as string | undefined;

  if (type === "join_request") {
    resolvedReceiverId = team.leader_id;

    const { data: existingMembership } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json({ error: "You are already in a team" }, { status: 409 });
    }
  } else {
    if (team.leader_id !== user.id) {
      return NextResponse.json({ error: "Only the team leader can send invites" }, { status: 403 });
    }
    if (!resolvedReceiverId) {
      return NextResponse.json({ error: "receiver_id is required for invites" }, { status: 400 });
    }

    const { data: inviteeMembership } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", resolvedReceiverId)
      .maybeSingle();

    if (inviteeMembership) {
      return NextResponse.json({ error: "Student is already in a team" }, { status: 409 });
    }
  }

  const { data: duplicate } = await supabase
    .from("requests")
    .select("id")
    .eq("team_id", team_id)
    .eq("sender_id", user.id)
    .eq("type", type)
    .eq("status", "pending")
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json({ error: "A pending request already exists" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("requests")
    .insert({
      sender_id: user.id,
      receiver_id: resolvedReceiverId,
      team_id,
      type,
      pitch_note: pitch_note?.trim() || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ request: data });
}

export async function PATCH(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { request_id, status } = body;

  if (!request_id || !["accepted", "rejected", "withdrawn"].includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: reqRow } = await supabase
    .from("requests")
    .select("*")
    .eq("id", request_id)
    .single();

  if (!reqRow) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (reqRow.status !== "pending") {
    return NextResponse.json({ error: "Request is no longer pending" }, { status: 409 });
  }

  const { data: team } = await supabase
    .from("teams")
    .select("leader_id, status, capacity")
    .eq("id", reqRow.team_id)
    .single();

  const canRespond =
    user.id === reqRow.receiver_id ||
    user.id === team?.leader_id ||
    (status === "withdrawn" && user.id === reqRow.sender_id);

  if (!canRespond) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (status === "accepted") {
    if (!team || team.status !== "open") {
      return NextResponse.json({ error: "Team is not open for new members" }, { status: 409 });
    }

    const memberUserId = reqRow.type === "invite" ? reqRow.receiver_id : reqRow.sender_id;

    const { data: existingMembership } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", memberUserId)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json({ error: "User is already in a team" }, { status: 409 });
    }

    const { count } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", reqRow.team_id);

    if ((count ?? 0) >= team.capacity) {
      return NextResponse.json({ error: "Team is full" }, { status: 409 });
    }

    const { error: addError } = await supabase.from("team_members").insert({
      team_id: reqRow.team_id,
      user_id: memberUserId,
    });

    if (addError) {
      return NextResponse.json({ error: addError.message }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("requests")
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq("id", request_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ request: data });
}

export const dynamic = "force-dynamic";
