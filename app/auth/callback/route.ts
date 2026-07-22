import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ALLOWED_DOMAINS = ["kiet.edu", "student.kiet.in", "kiet.in"];

function isDomainAllowed(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_DOMAINS.some((d) => domain === d || domain?.endsWith("." + d));
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${origin}/?error=supabase_not_configured`);
  }

  const supabaseResponse = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Exchange code for session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[Auth Callback] Session exchange failed:", error);
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const userEmail = data.user.email ?? "";

  // ── Domain Restriction ──────────────────────────────────────────────────────
  if (!isDomainAllowed(userEmail)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?error=invalid_domain`);
  }

  // ── Profile Bootstrap ──────────────────────────────────────────────────────
  // Check if a profile already exists for this user
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, profile_completeness")
    .eq("id", data.user.id)
    .single();

  if (!existingProfile) {
    // New user: create a skeleton profile
    const displayName =
      data.user.user_metadata?.full_name ||
      data.user.user_metadata?.name ||
      userEmail.split("@")[0];

    const avatarUrl =
      data.user.user_metadata?.avatar_url || null;

    await supabase.from("profiles").insert({
      id: data.user.id,
      kiet_email: userEmail,
      name: displayName,
      avatar_url: avatarUrl,
      profile_completeness: 15,
      role_preference: "both",
    });

    // Redirect new users to onboarding
    supabaseResponse.headers.set(
      "Location",
      `${origin}/onboard`
    );
    return NextResponse.redirect(`${origin}/onboard`, {
      headers: supabaseResponse.headers,
    });
  }

  // Existing user: is profile complete?
  const isComplete = (existingProfile.profile_completeness ?? 0) >= 80;
  const redirectTo = isComplete ? "/dashboard" : "/onboard";

  return NextResponse.redirect(`${origin}${redirectTo}`, {
    headers: supabaseResponse.headers,
  });
}
