import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { getAuthenticatedUser, isAdminProfile } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !isAdminProfile(profile)) return NextResponse.json({ error: "Only an admin can export certificates" }, { status: 403 });
  const teamId = request.nextUrl.searchParams.get("team_id");
  if (!teamId) return NextResponse.json({ error: "team_id is required" }, { status: 400 });
  const { data: team } = await supabase.from("teams").select("name, problem_statement_title").eq("id", teamId).single();
  const { data: certificates } = await supabase.from("team_certificates").select("id, user_id, certificate_number, issued_at, award_title, status").eq("team_id", teamId).eq("status", "active");
  if (!team || !certificates?.length) return NextResponse.json({ error: "No active certificates found for this team" }, { status: 404 });
  const ids = certificates.map((certificate) => certificate.user_id);
  const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", ids);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  certificates.forEach((certificate, index) => {
    if (index > 0) doc.addPage();
    const width = doc.internal.pageSize.getWidth(); const height = doc.internal.pageSize.getHeight();
    const recipient = profiles?.find((item) => item.id === certificate.user_id);
    doc.setFillColor(6, 10, 23); doc.rect(0, 0, width, height, "F");
    doc.setDrawColor(249, 115, 22); doc.setLineWidth(4); doc.rect(28, 28, width - 56, height - 56);
    doc.setTextColor(249, 115, 22); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("KIET GROUP OF INSTITUTIONS", width / 2, 100, { align: "center" });
    doc.setTextColor(255, 255, 255); doc.setFontSize(30); doc.text(String(certificate.award_title || "CERTIFICATE OF PARTICIPATION").toUpperCase(), width / 2, 170, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(15); doc.setTextColor(190, 200, 215); doc.text("This certificate is proudly presented to", width / 2, 220, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.setTextColor(255, 255, 255); doc.text(String(recipient?.name || "Student"), width / 2, 270, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(14); doc.setTextColor(190, 200, 215); doc.text(`for successfully completing Smart India Hackathon with team ${team.name}`, width / 2, 320, { align: "center" });
    doc.setFontSize(10); doc.text(`Certificate No. ${certificate.certificate_number}`, 55, height - 58); doc.text(`Issued ${new Date(certificate.issued_at).toLocaleDateString("en-IN")}`, width - 55, height - 58, { align: "right" });
  });
  return new NextResponse(doc.output("arraybuffer"), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${String(team.name).replace(/[^a-z0-9-_]+/gi, "_")}_certificates.pdf"`, "Cache-Control": "no-store" } });
}

export const dynamic = "force-dynamic";
