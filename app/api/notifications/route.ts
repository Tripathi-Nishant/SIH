import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ notifications: data || [] });
}

export async function PATCH(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await request.json();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
