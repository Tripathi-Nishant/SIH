import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const category = String(body.category || "").trim();
  const content = String(body.content || "").trim();
  const author = String(body.author || profile.name || "KIET Contributor").trim();
  const role = String(body.role || "KIET Contributor").trim();

  if (!category || !content) {
    return NextResponse.json({ error: "category and content are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("archive_tips")
    .insert({
      author_id: user.id,
      category,
      content,
      author,
      role,
      upvotes: 0,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Failed to save tip" }, { status: 400 });
  }

  return NextResponse.json({ tip: data });
}

export const dynamic = "force-dynamic";
