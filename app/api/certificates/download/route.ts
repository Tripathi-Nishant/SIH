import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { getAuthenticatedUser, isAdminProfile } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const certificateId = request.nextUrl.searchParams.get("certificate_id");
  if (!certificateId) return NextResponse.json({ error: "certificate_id is required" }, { status: 400 });

  const { data: certificate } = await supabase.from("team_certificates").select("*").eq("id", certificateId).single();
  if (!certificate) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  if (certificate.status === "revoked") return NextResponse.json({ error: "This certificate has been revoked" }, { status: 410 });
  if (certificate.user_id !== user.id && !isAdminProfile(profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ data: recipient }, { data: team }] = await Promise.all([
    supabase.from("profiles").select("name, branch, roll_no").eq("id", certificate.user_id).single(),
    supabase.from("teams").select("name, problem_statement_title, problem_statement_domain").eq("id", certificate.team_id).single(),
  ]);
  if (!recipient || !team) return NextResponse.json({ error: "Certificate details unavailable" }, { status: 404 });

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setFillColor(6, 10, 23); doc.rect(0, 0, width, height, "F");
  doc.setDrawColor(249, 115, 22); doc.setLineWidth(4); doc.rect(28, 28, width - 56, height - 56);
  doc.setDrawColor(16, 185, 129); doc.setLineWidth(1); doc.rect(40, 40, width - 80, height - 80);
  doc.setTextColor(249, 115, 22); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("KIET GROUP OF INSTITUTIONS", width / 2, 100, { align: "center" });
  doc.setTextColor(255, 255, 255); doc.setFontSize(34); doc.text(String(certificate.award_title || "CERTIFICATE OF PARTICIPATION").toUpperCase(), width / 2, 170, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(15); doc.setTextColor(190, 200, 215);
  doc.text("This certificate is proudly presented to", width / 2, 220, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.setTextColor(255, 255, 255);
  doc.text(String(recipient.name || "Student"), width / 2, 270, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(14); doc.setTextColor(190, 200, 215);
  doc.text(`for successfully completing Smart India Hackathon ${new Date(certificate.issued_at).getFullYear()} at college level`, width / 2, 315, { align: "center" });
  doc.setTextColor(16, 185, 129); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text(String(team.name), width / 2, 360, { align: "center" });
  doc.setTextColor(190, 200, 215); doc.setFont("helvetica", "normal"); doc.setFontSize(12);
  doc.text(String(team.problem_statement_title || team.problem_statement_domain || "Hackathon Team"), width / 2, 386, { align: "center" });
  doc.setFontSize(10); doc.text(`Certificate No. ${certificate.certificate_number}`, 55, height - 58);
  const verificationUrl = `${request.nextUrl.origin}/verify/${certificate.verification_token}`;
  doc.text(`Verify: ${verificationUrl}`, width / 2, height - 58, { align: "center" });
  doc.text(`Issued ${new Date(certificate.issued_at).toLocaleDateString("en-IN")}`, width - 55, height - 58, { align: "right" });
  try {
    const qrResponse = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verificationUrl)}`);
    if (qrResponse.ok) {
      const qrBase64 = Buffer.from(await qrResponse.arrayBuffer()).toString("base64");
      doc.addImage(`data:image/png;base64,${qrBase64}`, "PNG", width - 145, 425, 90, 90);
      doc.setFontSize(9); doc.text("Scan to verify", width - 100, 525, { align: "center" });
    }
  } catch { /* The text verification URL remains available if the QR service is unavailable. */ }

  const bytes = doc.output("arraybuffer");
  const filename = `${String(recipient.name || "student").replace(/[^a-z0-9-_]+/gi, "_")}_certificate.pdf`;
  return new NextResponse(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
}

export const dynamic = "force-dynamic";
