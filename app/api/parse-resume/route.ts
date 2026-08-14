import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { RESUME_SKILL_NAMES } from "@/lib/skills";
import { downloadS3Object } from "@/lib/s3";

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
    const pdf = require("pdf-parse");
    const parsed = await pdf(buffer);
    const text = parsed.text as string;

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
