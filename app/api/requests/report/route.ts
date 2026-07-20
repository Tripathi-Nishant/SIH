import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";

/**
 * POST /api/requests/report
 * Body: { request_id: string, action: "report" | "block", reason?: string }
 *
 * - "block": adds the sender to the current user's block list so they can no
 *   longer send invites.
 * - "report": flags the sender for admin review (also implicitly blocks).
 */
export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { request_id, action, reason } = body;

  if (!request_id || !["report", "block"].includes(action)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Verify the invite belongs to this user
  const { data: reqRow } = await supabase
    .from("requests")
    .select("id, sender_id, receiver_id, type")
    .eq("id", request_id)
    .single();

  if (!reqRow || reqRow.receiver_id !== user.id) {
    return NextResponse.json({ error: "Request not found or access denied" }, { status: 404 });
  }

  const senderToBlock = reqRow.sender_id;

  // ── Always upsert a block record ─────────────────────────────────────────────
  const { error: blockError } = await supabase
    .from("user_blocks")
    .upsert(
      { blocker_id: user.id, blocked_id: senderToBlock },
      { onConflict: "blocker_id,blocked_id" }
    );

  if (blockError) {
    return NextResponse.json({ error: blockError.message }, { status: 400 });
  }

  // ── If reporting, also create a report record for admin review ──────────────
  if (action === "report") {
    if (!reason?.trim()) {
      return NextResponse.json({ error: "A reason is required when reporting" }, { status: 400 });
    }

    const { error: reportError } = await supabase.from("user_reports").insert({
      reporter_id: user.id,
      reported_id: senderToBlock,
      request_id,
      reason: reason.trim(),
    });

    if (reportError) {
      return NextResponse.json({ error: reportError.message }, { status: 400 });
    }
  }

  // ── Withdraw the original invite so it leaves the inbox ─────────────────────
  await supabase
    .from("requests")
    .update({ status: "withdrawn", responded_at: new Date().toISOString() })
    .eq("id", request_id)
    .eq("status", "pending");

  return NextResponse.json({
    blocked: true,
    reported: action === "report",
    message:
      action === "report"
        ? "The sender has been blocked and flagged for admin review."
        : "The sender has been blocked. They can no longer send you invites.",
  });
}

export const dynamic = "force-dynamic";
