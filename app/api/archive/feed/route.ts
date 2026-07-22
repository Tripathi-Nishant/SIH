import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request);

  const [pptsRes, tipsRes, pptVotesRes, tipVotesRes] = await Promise.all([
    supabase.from("archive_ppts").select("*").order("created_at", { ascending: false }),
    supabase.from("archive_tips").select("*").order("created_at", { ascending: false }),
    supabase.from("user_upvotes_ppts").select("ppt_id"),
    supabase.from("user_upvotes_tips").select("tip_id"),
  ]);

  const ppts = pptsRes.error ? [] : pptsRes.data || [];
  const tips = tipsRes.error ? [] : tipsRes.data || [];
  const pptVotes = pptVotesRes.error ? [] : pptVotesRes.data || [];
  const tipVotes = tipVotesRes.error ? [] : tipVotesRes.data || [];

  return NextResponse.json({
    user_id: user?.id || null,
    ppts,
    tips,
    pptVotes,
    tipVotes,
  });
}

export const dynamic = "force-dynamic";
