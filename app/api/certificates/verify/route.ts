import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
  const db = getServiceClient();
  const { data: certificate, error } = await db.from("team_certificates").select("id, certificate_number, status, award_title, issued_at, revoked_at, revoked_reason, team_id, user_id").eq("verification_token", token).maybeSingle();
  if (error || !certificate) return NextResponse.json({ valid: false, error: "Certificate not found" }, { status: 404 });
  const [{ data: member }, { data: team }] = await Promise.all([
    db.from("profiles").select("name, branch, roll_no").eq("id", certificate.user_id).single(),
    db.from("teams").select("name, problem_statement_title, problem_statement_domain, award_title, result_rank").eq("id", certificate.team_id).single(),
  ]);
  return NextResponse.json({ valid: certificate.status === "active", certificate, member, team });
}

export const dynamic = "force-dynamic";
