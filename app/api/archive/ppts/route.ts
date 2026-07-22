import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const teamName = String(formData.get("team_name") || "").trim();
  const psTitle = String(formData.get("ps_title") || "").trim();
  const psDomain = String(formData.get("ps_domain") || "").trim();
  const track = String(formData.get("track") || "Software").trim();
  const retrospective = String(formData.get("retrospective") || "").trim();
  const year = Number(formData.get("year") || new Date().getFullYear());

  if (!file || !teamName || !psTitle || !retrospective) {
    return NextResponse.json(
      { error: "file, team_name, ps_title, and retrospective are required" },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }

  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 15MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const safeTeamName = teamName.replace(/[^a-z0-9-_]+/gi, "_");
  const storagePath = `${user.id}/${Date.now()}-${safeTeamName}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("archive_ppts").upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: publicUrlData } = supabase.storage.from("archive_ppts").getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from("archive_ppts")
    .insert({
      author_id: user.id,
      year,
      team_name: teamName,
      ps_title: psTitle,
      ps_domain: psDomain || "General",
      track: track === "Hardware" ? "Hardware" : "Software",
      file_url: publicUrlData.publicUrl,
      storage_path: storagePath,
      retrospective,
      upvotes: 0,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Failed to save archive entry" }, { status: 400 });
  }

  return NextResponse.json({ ppt: data });
}

export const dynamic = "force-dynamic";
