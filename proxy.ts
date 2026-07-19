import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_ROUTES = ["/dashboard", "/browse", "/teams", "/onboard", "/admin", "/hall-of-fame", "/settings"];
const PROFILE_COMPLETE_THRESHOLD = 80;

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_ROUTES.some(
    (route) => path === route || path.startsWith(route + "/")
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "auth_required");
    return NextResponse.redirect(url);
  }

  let profileCompleteness = 100;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_completeness, role")
      .eq("id", user.id)
      .single();

    profileCompleteness = profile?.profile_completeness ?? 0;

    if (path === "/admin" && profile?.role !== "admin" && profile?.role !== "faculty") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    const needsOnboarding = profileCompleteness < PROFILE_COMPLETE_THRESHOLD;
    const onboardingRoutes = ["/onboard", "/auth/callback", "/api"];

    if (
      needsOnboarding &&
      isProtected &&
      !onboardingRoutes.some((route) => path.startsWith(route))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboard";
      return NextResponse.redirect(url);
    }
  }

  if (path === "/" && user) {
    const url = request.nextUrl.clone();
    url.pathname =
      profileCompleteness < PROFILE_COMPLETE_THRESHOLD ? "/onboard" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
