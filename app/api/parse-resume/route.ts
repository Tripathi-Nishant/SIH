import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { RESUME_SKILL_NAMES } from "@/lib/skills";
import { downloadS3Object } from "@/lib/s3";
import { PDFParse } from "pdf-parse";

export async function POST(request: NextRequest) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const storagePath = String(body.storage_path || "").trim();
  if (!storagePath.startsWith(`resume/${user.id}/`)) {
    return NextResponse.json({ error: "Invalid resume storage path" }, { status: 400 });
  }

  try {
    const object = await downloadS3Object(storagePath);
    if (!object.Body) throw new Error("Resume file could not be read");
    const buffer = Buffer.from(await object.Body.transformToByteArray());
    if (buffer.length > 5 * 1024 * 1024) throw new Error("File must be under 5MB");
    // Use pdf-parse's Node API. The legacy callable API loads the browser
    // PDF.js build and can fail on the server with "DOMMatrix is not defined".
    const parser = new PDFParse({ data: buffer });
    let text: string;
    try {
      const parsed = await parser.getText();
      text = parsed.text;
    } finally {
      await parser.destroy();
    }

    const detectedSkills: string[] = [];
    for (const skill of RESUME_SKILL_NAMES) {
      const regex = new RegExp(`\\b${skill.replace(".", "\\.")}\\b`, "i");
      if (regex.test(text)) detectedSkills.push(skill);
    }

    return NextResponse.json({ success: true, skills: detectedSkills });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
