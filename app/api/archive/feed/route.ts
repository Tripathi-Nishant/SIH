import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { createDownloadUrl } from "@/lib/s3";

export async function GET(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request);

  const [pptsRes, tipsRes, pptVotesRes, tipVotesRes] = await Promise.all([
    supabase.from("archive_ppts").select("*").order("created_at", { ascending: false }),
    supabase.from("archive_tips").select("*").order("created_at", { ascending: false }),
    supabase.from("user_upvotes_ppts").select("ppt_id"),
    supabase.from("user_upvotes_tips").select("tip_id"),
  ]);

  if (pptsRes.error) console.error("Hall of Fame pitch feed error:", pptsRes.error);
  if (tipsRes.error) console.error("Hall of Fame tips feed error:", tipsRes.error);

  const rawPpts = pptsRes.error ? [] : pptsRes.data || [];
  const ppts = await Promise.all(rawPpts.map(async (ppt: { storage_path?: string | null; file_url?: string | null; [key: string]: unknown }) => ({
    ...ppt,
    file_url: ppt.storage_path ? await createDownloadUrl(ppt.storage_path).catch(() => "") : ppt.file_url,
  })));
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
