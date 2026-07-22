import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getServiceClient, isAdminProfile } from "@/lib/api-auth";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: entry } = await supabase
    .from("archive_tips")
    .select("id, author_id")
    .eq("id", id)
    .single();

  if (!entry) {
    return NextResponse.json({ error: "Tip not found" }, { status: 404 });
  }

  const canDelete = entry.author_id === user.id || isAdminProfile(profile);
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = isAdminProfile(profile) ? getServiceClient() : supabase;
  const { error } = await db.from("archive_tips").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await db.from("user_upvotes_tips").delete().eq("tip_id", id);

  return NextResponse.json({ message: "Tip deleted successfully" });
}

export const dynamic = "force-dynamic";
