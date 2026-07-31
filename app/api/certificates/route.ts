import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminProfile } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = request.nextUrl.searchParams.get("team_id");
  if (!teamId) return NextResponse.json({ error: "team_id is required" }, { status: 400 });

  const query = supabase.from("team_certificates").select("*").eq("team_id", teamId);
  const { data, error } = isAdminProfile(profile)
    ? await query
    : await query.eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ certificates: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !isAdminProfile(profile)) {
    return NextResponse.json({ error: "Only an admin can issue certificates" }, { status: 403 });
  }

  const { team_id: teamId } = await request.json();
  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json({ error: "team_id is required" }, { status: 400 });
  }

  const { data: season } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "season_concluded")
    .maybeSingle();
  if (season?.value !== "true") {
    return NextResponse.json({ error: "Conclude the hackathon season before issuing certificates" }, { status: 409 });
  }

  const { data: team } = await supabase.from("teams").select("id, name").eq("id", teamId).single();
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId);
  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 400 });
  if (!members?.length) return NextResponse.json({ error: "This team has no members" }, { status: 409 });

  const rows = members.map((member) => ({
    team_id: teamId,
    user_id: member.user_id,
    issued_by: user.id,
    certificate_number: `KIET-SIH-${new Date().getFullYear()}-${teamId.slice(0, 8).toUpperCase()}-${member.user_id.slice(0, 8).toUpperCase()}`,
  }));

  const { data: certificates, error } = await supabase
    .from("team_certificates")
    .upsert(rows, { onConflict: "team_id,user_id" })
    .select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ team, certificates, message: `Certificates issued to ${rows.length} team members.` });
}

export const dynamic = "force-dynamic";
