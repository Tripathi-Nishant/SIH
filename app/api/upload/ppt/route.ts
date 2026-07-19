import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const teamName = String(formData.get("team_name") || "").trim();
  const psTitle = String(formData.get("ps_title") || "").trim();

  if (!file || !teamName || !psTitle) {
    return NextResponse.json({ error: "file, team_name, and ps_title are required" }, { status: 400 });
  }

  const allowedTypes = [
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF or PPT/PPTX files are allowed" }, { status: 400 });
  }

  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 15MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${user.id}/${Date.now()}-${teamName.replace(/[^a-z0-9-_]+/gi, "_")}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from("ppts").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: publicUrlData } = supabase.storage.from("ppts").getPublicUrl(path);

  return NextResponse.json({
    file_url: publicUrlData.publicUrl,
    storage_path: path,
  });
}

export const dynamic = "force-dynamic";
