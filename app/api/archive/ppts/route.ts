import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { assertS3ObjectExists, deleteS3Object } from "@/lib/s3";

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const storagePath = String(body.storage_path || "").trim();
  const teamName = String(body.team_name || "").trim();
  const psTitle = String(body.ps_title || "").trim();
  const psDomain = String(body.ps_domain || "").trim();
  const track = String(body.track || "Software").trim();
  const retrospective = String(body.retrospective || "").trim();
  const year = Number(body.year || new Date().getFullYear());

  if (!storagePath || !teamName || !psTitle || !retrospective) {
    return NextResponse.json(
      { error: "storage_path, team_name, ps_title, and retrospective are required" },
      { status: 400 }
    );
  }

  if (!storagePath.startsWith(`pitch/${user.id}/`)) {
    return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
  }

  try {
    await assertS3ObjectExists(storagePath);
  } catch {
    return NextResponse.json({ error: "Uploaded pitch file was not found" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("archive_ppts")
    .insert({
      author_id: user.id,
      year,
      team_name: teamName,
      ps_title: psTitle,
      ps_domain: psDomain || "General",
      track: track === "Hardware" ? "Hardware" : "Software",
      file_url: "",
      storage_path: storagePath,
      retrospective,
      upvotes: 0,
    })
    .select()
    .single();

  if (error || !data) {
    await deleteS3Object(storagePath).catch(() => undefined);
    return NextResponse.json({ error: error?.message || "Failed to save archive entry" }, { status: 400 });
  }

  return NextResponse.json({ ppt: data });
}

export const dynamic = "force-dynamic";
