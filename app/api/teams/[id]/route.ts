import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getServiceClient, isAdminProfile } from "@/lib/api-auth";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  const allowedFields = [
    "name",
    "problem_statement_title",
    "problem_statement_domain",
    "required_skills_json",
    "capacity",
    "status",
    "visibility",
    "award_title",
    "result_rank",
    "result_published",
  ] as const;

  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (updates.name !== undefined && !String(updates.name).trim()) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 });
  }

  if (updates.capacity !== undefined) {
    const capacity = Number(updates.capacity);
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 6) {
      return NextResponse.json({ error: "Capacity must be between 2 and 6" }, { status: 400 });
    }
    updates.capacity = capacity;
  }

  if (updates.status !== undefined && !["open", "full", "locked"].includes(String(updates.status))) {
    return NextResponse.json({ error: "Invalid team status" }, { status: 400 });
  }

  if (updates.visibility !== undefined && !["public", "private"].includes(String(updates.visibility))) {
    return NextResponse.json({ error: "Invalid visibility value" }, { status: 400 });
  }

  if ((updates.award_title !== undefined || updates.result_rank !== undefined || updates.result_published !== undefined) && !isAdminProfile(profile)) {
    return NextResponse.json({ error: "Only an admin can publish hackathon results" }, { status: 403 });
  }

  const { data: team } = await supabase.from("teams").select("id, leader_id").eq("id", id).single();
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const canEdit = team.leader_id === user.id || isAdminProfile(profile);
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = isAdminProfile(profile) ? getServiceClient() : supabase;
  const { data, error } = await db.from("teams").update(updates).eq("id", id).select().single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Failed to update team" }, { status: 400 });
  }

  return NextResponse.json({ team: data });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: team } = await supabase.from("teams").select("id, leader_id").eq("id", id).single();
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const canDelete = team.leader_id === user.id || isAdminProfile(profile);
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = isAdminProfile(profile) ? getServiceClient() : supabase;
  const { error } = await db.from("teams").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Team deleted successfully" });
}

export const dynamic = "force-dynamic";
