import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminProfile } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !isAdminProfile(profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const studentId = body.student_id as string;
  if (!studentId) {
    return NextResponse.json({ error: "student_id is required" }, { status: 400 });
  }

  const { data: student } = await supabase
    .from("profiles")
    .select("name, kiet_email")
    .eq("id", studentId)
    .single();

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "SIH Portal <noreply@kiet.edu>";

  if (!resendKey) {
    console.info(`[Nudge] Email disabled — would nudge ${student.kiet_email}`);
    return NextResponse.json({
      sent: false,
      message: "Email service not configured. Set RESEND_API_KEY to enable nudges.",
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: student.kiet_email,
      subject: "KIET SIH Team Finder — Complete Your Team Match",
      html: `<p>Hi ${student.name || "Student"},</p><p>You are registered on the KIET SIH Team Finder but not yet matched to a squad. Please log in and join or create a team before the internal nomination deadline.</p><p>— KIET SIH Coordination Cell</p>`,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: errText }, { status: 502 });
  }

  return NextResponse.json({ sent: true, message: `Nudge sent to ${student.kiet_email}` });
}

export const dynamic = "force-dynamic";
