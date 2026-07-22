import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyOAuthState } from "@/lib/oauth-state";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Code or state parameter missing" }, { status: 400 });
  }

  const userId = verifyOAuthState(state);
  if (!userId) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 403 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "GitHub integration environment variables not configured" }, { status: 500 });
  }

  // Create Supabase admin client lazily inside the handler (avoids build-time env validation)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase environment variables not configured" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Exchange OAuth code for GitHub Access Token
    const resToken = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await resToken.json();

    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || "Failed to exchange OAuth token");
    }

    const token = tokenData.access_token;

    // Fetch user profile from GitHub REST API
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const githubUser = await userRes.json();

    // Fetch repositories
    const reposRes = await fetch("https://api.github.com/user/repos?per_page=10&sort=pushed", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const repos = await reposRes.json();

    const repoNames = Array.isArray(repos) ? repos.map((r: any) => r.name) : [];

    // Extract unique languages used across repos
    const languagesSet = new Set<string>();
    if (Array.isArray(repos)) {
      repos.forEach((r: any) => {
        if (r.language) languagesSet.add(r.language);
      });
    }

    const githubVerifiedSkills = Array.from(languagesSet);

    // Fetch matching skills from DB to verify
    const { data: dbSkills } = await supabase.from("skills").select("*");

    const userSkillsToInsert: any[] = [];
    if (dbSkills) {
      githubVerifiedSkills.forEach((lang) => {
        const found = dbSkills.find((s: any) => s.name.toLowerCase() === lang.toLowerCase());
        if (found) {
          userSkillsToInsert.push({
            user_id: userId,
            skill_id: found.id,
            proficiency: "intermediate",
            source: "github-verified",
            confidence_score: 85,
          });
        }
      });
    }

    // Upsert verified user skills
    if (userSkillsToInsert.length > 0) {
      await supabase.from("user_skills").delete().eq("user_id", userId).eq("source", "github-verified");
      await supabase.from("user_skills").insert(userSkillsToInsert);
    }

    // Update profile with GitHub username and verification flag
    await supabase
      .from("profiles")
      .update({
        github_username: githubUser.login,
        github_verified: true,
      })
      .eq("id", userId);

    // Redirect back to onboarding with success status
    const baseUrl = new URL(req.url).origin;
    return NextResponse.redirect(`${baseUrl}/onboard?github_sync=success&username=${githubUser.login}`);
  } catch (err: any) {
    console.error("GitHub sync OAuth callback error:", err);
    const baseUrl = new URL(req.url).origin;
    return NextResponse.redirect(
      `${baseUrl}/onboard?github_sync=error&message=${encodeURIComponent(err.message)}`
    );
  }
}
