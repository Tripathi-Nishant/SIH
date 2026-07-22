import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminProfile } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "inbox";

  let query = supabase
    .from("mentor_requests")
    .select("*, team:teams(*), requester:profiles!mentor_requests_requester_id_fkey(*), mentor:profiles!mentor_requests_mentor_id_fkey(*)")
    .order("created_at", { ascending: false });

  if (!isAdminProfile(profile)) {
    query = query.or(`requester_id.eq.${user.id},mentor_id.eq.${user.id},team.leader_id.eq.${user.id}`);
  }

  if (scope === "sent") {
    query = query.eq("requester_id", user.id);
  } else if (scope === "assigned") {
    query = query.eq("mentor_id", user.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ requests: data || [] });
}

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const teamId = String(body.team_id || "").trim();
  const mentorId = String(body.mentor_id || "").trim();
  const note = String(body.note || "").trim();

  if (!teamId || !mentorId) {
    return NextResponse.json({ error: "team_id and mentor_id are required" }, { status: 400 });
  }

  const { data: team } = await supabase.from("teams").select("id, leader_id, name, visibility").eq("id", teamId).single();
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (team.leader_id !== user.id && !isAdminProfile(profile)) {
    return NextResponse.json({ error: "Only the team leader can request a mentor" }, { status: 403 });
  }

  const { data: mentorProfile } = await supabase
    .from("mentor_profiles")
    .select("id, is_active, max_teams, profiles:profiles(*)")
    .eq("id", mentorId)
    .maybeSingle();

  if (!mentorProfile || !mentorProfile.is_active) {
    return NextResponse.json({ error: "Mentor not available" }, { status: 404 });
  }

  const { data: existingAssignment } = await supabase
    .from("team_mentors")
    .select("id")
    .eq("team_id", teamId)
    .eq("active", true)
    .maybeSingle();

  if (existingAssignment) {
    return NextResponse.json({ error: "This team already has an active mentor" }, { status: 409 });
  }

  const { data: duplicate } = await supabase
    .from("mentor_requests")
    .select("id")
    .eq("team_id", teamId)
    .eq("mentor_id", mentorId)
    .eq("status", "pending")
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json({ error: "A pending request already exists for this mentor" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("mentor_requests")
    .insert({
      team_id: teamId,
      requester_id: user.id,
      mentor_id: mentorId,
      note: note || null,
      status: "pending",
    })
    .select("*, team:teams(*), requester:profiles!mentor_requests_requester_id_fkey(*), mentor:profiles!mentor_requests_mentor_id_fkey(*)")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Failed to create mentor request" }, { status: 400 });
  }

  return NextResponse.json({ request: data });
}

export async function PATCH(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const requestId = String(body.request_id || "").trim();
  const status = String(body.status || "").trim();

  if (!requestId || !["accepted", "rejected", "withdrawn"].includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: reqRow } = await supabase
    .from("mentor_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!reqRow) {
    return NextResponse.json({ error: "Mentor request not found" }, { status: 404 });
  }

  const canRespond =
    user.id === reqRow.mentor_id ||
    user.id === reqRow.requester_id ||
    isAdminProfile(profile);

  if (!canRespond) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (status === "accepted") {
    if (user.id !== reqRow.mentor_id && !isAdminProfile(profile)) {
      return NextResponse.json({ error: "Only the mentor can accept this request" }, { status: 403 });
    }

    const { data: teamMentor } = await supabase
      .from("team_mentors")
      .select("id")
      .eq("team_id", reqRow.team_id)
      .eq("active", true)
      .maybeSingle();

    if (teamMentor) {
      return NextResponse.json({ error: "This team already has an active mentor" }, { status: 409 });
    }

    const { data: mentorProfile } = await supabase
      .from("mentor_profiles")
      .select("max_teams, is_active")
      .eq("id", reqRow.mentor_id)
      .single();

    if (!mentorProfile?.is_active) {
      return NextResponse.json({ error: "Mentor is not available" }, { status: 409 });
    }

    const { count: activeTeams } = await supabase
      .from("team_mentors")
      .select("*", { count: "exact", head: true })
      .eq("mentor_id", reqRow.mentor_id)
      .eq("active", true);

    if ((activeTeams ?? 0) >= (mentorProfile.max_teams ?? 3)) {
      return NextResponse.json({ error: "Mentor has reached their active team limit" }, { status: 409 });
    }

    const { error: assignError } = await supabase.from("team_mentors").insert({
      team_id: reqRow.team_id,
      mentor_id: reqRow.mentor_id,
      assigned_from_request_id: reqRow.id,
      active: true,
    });

    if (assignError) {
      return NextResponse.json({ error: assignError.message }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("mentor_requests")
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select("*, team:teams(*), requester:profiles!mentor_requests_requester_id_fkey(*), mentor:profiles!mentor_requests_mentor_id_fkey(*)")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Failed to update mentor request" }, { status: 400 });
  }

  return NextResponse.json({ request: data });
}

export const dynamic = "force-dynamic";
