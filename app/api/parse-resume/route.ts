import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { RESUME_SKILL_NAMES } from "@/lib/skills";

export async function POST(request: NextRequest) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as Blob | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
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
