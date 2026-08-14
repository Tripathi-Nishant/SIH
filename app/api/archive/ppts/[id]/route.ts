import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getServiceClient, isAdminProfile } from "@/lib/api-auth";
import { deleteS3Object } from "@/lib/s3";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: entry } = await supabase
    .from("archive_ppts")
    .select("id, author_id, storage_path")
    .eq("id", id)
    .single();

  if (!entry) {
    return NextResponse.json({ error: "Pitch deck not found" }, { status: 404 });
  }

  const canDelete = entry.author_id === user.id || isAdminProfile(profile);
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = isAdminProfile(profile) ? getServiceClient() : supabase;

  if (entry.storage_path) {
    if (entry.storage_path.startsWith("pitch/")) {
      await deleteS3Object(entry.storage_path).catch(() => undefined);
    } else {
      await db.storage.from("archive_ppts").remove([entry.storage_path]);
    }
  }

  const { error } = await db.from("archive_ppts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await db.from("user_upvotes_ppts").delete().eq("ppt_id", id);

  return NextResponse.json({ message: "Pitch deck deleted successfully" });
}

export const dynamic = "force-dynamic";
