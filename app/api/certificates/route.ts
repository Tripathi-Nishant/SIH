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

  const { team_id: teamId, award_title: awardTitle } = await request.json();
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
  const { data: memberProfiles } = await supabase.from("profiles").select("id, name, kiet_email").in("id", members.map((member) => member.user_id));

  const rows = members.map((member) => ({
    team_id: teamId,
    user_id: member.user_id,
    issued_by: user.id,
    certificate_number: `KIET-SIH-${new Date().getFullYear()}-${teamId.slice(0, 8).toUpperCase()}-${member.user_id.slice(0, 8).toUpperCase()}`,
    verification_token: `${teamId}-${member.user_id}`,
    status: "active",
    award_title: typeof awardTitle === "string" && awardTitle.trim() ? awardTitle.trim() : null,
  }));

  const { data: certificates, error } = await supabase
    .from("team_certificates")
    .upsert(rows, { onConflict: "team_id,user_id" })
    .select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (certificates?.length) {
    await supabase.from("certificate_audit_log").insert(certificates.map((certificate) => ({
      certificate_id: certificate.id,
      actor_id: user.id,
      action: "issued",
      details: { team_id: teamId, award_title: awardTitle || null },
    })));
    await supabase.from("notifications").insert(members.map((member) => ({
      user_id: member.user_id,
      title: "Your hackathon certificate is ready",
      message: `Your certificate for ${team.name} has been issued by the college admin.`,
      href: `/teams/${teamId}`,
      kind: "certificate",
    })));
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && memberProfiles?.length) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "SIH Portal <noreply@kiet.edu>";
      await Promise.all(memberProfiles.filter((member) => member.kiet_email).map((member) => fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromEmail, to: member.kiet_email, subject: `Your KIET SIH certificate for ${team.name} is ready`, html: `<p>Hi ${member.name || "Student"},</p><p>Your certificate for <strong>${team.name}</strong> has been issued by the college admin.</p><p>Log in to the SIH Portal to download and share it.</p>` }),
      }).catch(() => null)));
    }
  }

  return NextResponse.json({ team, certificates, message: `Certificates issued to ${rows.length} team members.` });
}

export async function PATCH(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !isAdminProfile(profile)) return NextResponse.json({ error: "Only an admin can manage certificates" }, { status: 403 });
  const { certificate_id: certificateId, action, reason, award_title: awardTitle } = await request.json();
  if (!certificateId || !["revoke", "restore", "award"].includes(action)) return NextResponse.json({ error: "Invalid certificate action" }, { status: 400 });
  const updates = action === "revoke"
    ? { status: "revoked", revoked_at: new Date().toISOString(), revoked_by: user.id, revoked_reason: reason || "Revoked by administrator" }
    : action === "restore"
      ? { status: "active", revoked_at: null, revoked_by: null, revoked_reason: null }
      : { award_title: typeof awardTitle === "string" ? awardTitle.trim() || null : null };
  const { data: certificate, error } = await supabase.from("team_certificates").update(updates).eq("id", certificateId).select().single();
  if (error || !certificate) return NextResponse.json({ error: error?.message || "Certificate not found" }, { status: 400 });
  await supabase.from("certificate_audit_log").insert({ certificate_id: certificateId, actor_id: user.id, action: action === "revoke" ? "revoked" : action === "restore" ? "restored" : "award_updated", details: { reason: reason || null, award_title: awardTitle || null } });
  return NextResponse.json({ certificate });
}

export const dynamic = "force-dynamic";
