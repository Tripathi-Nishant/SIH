import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: voteError } = await supabase.from("user_upvotes_tips").upsert({
    tip_id: id,
    user_id: user.id,
  });

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 400 });
  }

  const { count } = await supabase
    .from("user_upvotes_tips")
    .select("*", { count: "exact", head: true })
    .eq("tip_id", id);

  const { error: updateError } = await supabase
    .from("archive_tips")
    .update({ upvotes: count ?? 0 })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ upvotes: count ?? 0 });
}

export const dynamic = "force-dynamic";
