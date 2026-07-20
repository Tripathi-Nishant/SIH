import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function PATCH(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser(request);
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const allowedFields = [
    "name",
    "branch",
    "year",
    "roll_no",
    "bio",
    "github_username",
    "linkedin_url",
    "portfolio_url",
    "role_preference",
    "profile_completeness",
    "github_verified",
    "gender",
    "open_to_invites",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (updates.roll_no && !/^\d{13}$/.test(String(updates.roll_no))) {
    return NextResponse.json(
      { error: "Roll number must be exactly 13 digits" },
      { status: 400 }
    );
  }

  if (updates.year && ![1, 2, 3, 4].includes(Number(updates.year))) {
    return NextResponse.json({ error: "Invalid academic year" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ profile: data });
}

export const dynamic = "force-dynamic";
