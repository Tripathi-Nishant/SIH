import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { createUploadUrl } from "@/lib/s3";
import { randomUUID } from "crypto";

const FILE_RULES = {
  resume: { maxBytes: 5 * 1024 * 1024, types: ["application/pdf"] },
  pitch: {
    maxBytes: 15 * 1024 * 1024,
    types: [
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
} as const;

export async function POST(request: NextRequest) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const kind = body.kind as keyof typeof FILE_RULES;
    const rule = FILE_RULES[kind];
    const fileName = String(body.fileName || "");
    const contentType = String(body.contentType || "");
    const size = Number(body.size);

    if (!rule || !fileName || !rule.types.includes(contentType as never)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > rule.maxBytes) {
      return NextResponse.json({ error: `File must be under ${rule.maxBytes / 1024 / 1024}MB` }, { status: 400 });
    }

    const safeName = fileName.replace(/[^a-z0-9._-]+/gi, "_");
    const key = `${kind}/${user.id}/${randomUUID()}-${safeName}`;
    const uploadUrl = await createUploadUrl(key, contentType);
    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
