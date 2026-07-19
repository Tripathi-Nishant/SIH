"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ShieldCheck, Mail, Key, Send, Info, AlertCircle } from "lucide-react";

// Google SVG icon
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_domain:
    "Only KIET institutional email addresses (@kiet.edu / @student.kiet.in) are permitted. Please use your college Google account.",
  auth_failed: "Authentication failed. Please try again.",
  auth_required: "Please sign in to access that page.",
  missing_code: "Something went wrong with the OAuth flow. Please try again.",
};

// Inner component that uses useSearchParams (must be wrapped in Suspense)
function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authMode, setAuthMode] = useState<"google" | "otp">("google");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(ERROR_MESSAGES[errorParam] || "An unexpected error occurred.");
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            // Request institutional account picker, not personal Gmail
            hd: "kiet.edu",
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to start Google sign-in.");
      setLoading(false);
    }
  };

  const validateKietEmail = (emailStr: string) => {
    const domain = emailStr.split("@")[1]?.toLowerCase();
    return domain === "kiet.edu" || domain === "student.kiet.in" || domain === "kiet.in";
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateKietEmail(email)) {
      setError("Please use a valid KIET email (e.g. name@kiet.edu).");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setOtpSent(true);
      setOtpStep("code");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: otp,
        type: "email",
      });
      if (error) throw error;
      if (!data.user) throw new Error("Session not created.");

      // Check profile completeness
      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_completeness")
        .eq("id", data.user.id)
        .single();

      if (!profile) {
        // New user — insert skeleton profile
        await supabase.from("profiles").insert({
          id: data.user.id,
          kiet_email: data.user.email,
          name: data.user.email?.split("@")[0] || "",
          profile_completeness: 15,
          role_preference: "both",
        });
        router.push("/onboard");
      } else if ((profile.profile_completeness ?? 0) < 80) {
        router.push("/onboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Invalid code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-[#060a17]">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-orange-950/10 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-10 items-center z-10">

        {/* ── Hero Left ────────────────────────────────────────────────────── */}
        <div className="md:col-span-7 flex flex-col justify-center text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit">
            <span className="flex h-2 w-2 rounded-full bg-[#f97316] animate-pulse"></span>
            <span className="text-xs font-semibold text-gray-300">SIH 2026 Season Active</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Form Your Dream Team for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] via-white to-[#10b981]">
              Smart India Hackathon
            </span>
          </h1>

          <p className="text-base text-gray-400 max-w-lg">
            Exclusively for{" "}
            <strong className="text-white">KIET Group of Institutions</strong>.
            Build balanced squads, find verified developers, sync GitHub profiles, and auto-generate official nomination cards.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="glass p-4 rounded-xl border border-white/5">
              <div className="text-2xl font-bold text-[#f97316]">6 Members</div>
              <p className="text-xs text-gray-400 mt-1">Required team size per SIH rules</p>
            </div>
            <div className="glass p-4 rounded-xl border border-white/5">
              <div className="text-2xl font-bold text-[#10b981]">GitHub</div>
              <p className="text-xs text-gray-400 mt-1">Auto-verified skill badges from repos</p>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-3 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
              <ShieldCheck className="h-3.5 w-3.5 text-[#10b981]" />
              KIET domain-restricted access
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
              🔒 Secured by Google OAuth
            </span>
          </div>
        </div>

        {/* ── Auth Card ─────────────────────────────────────────────────────── */}
        <div className="md:col-span-5 w-full">
          <div className="glass p-8 rounded-2xl border border-white/10 shadow-2xl relative">
            {/* Tricolor accent bar */}
            <div className="h-[3px] absolute top-0 left-0 right-0 flex rounded-t-2xl overflow-hidden">
              <div className="w-1/3 bg-[#f97316]"></div>
              <div className="w-1/3 bg-white"></div>
              <div className="w-1/3 bg-[#10b981]"></div>
            </div>

            <div className="mb-6 text-center">
              <h3 className="text-xl font-bold text-white">Access Portal</h3>
              <p className="text-xs text-gray-400 mt-1">Sign in with your KIET institutional Google account</p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-5 p-3 rounded-lg bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* ── Google OAuth (Primary) ────────────────────────────────────── */}
            {authMode === "google" && (
              <div className="space-y-4">
                <button
                  id="google-signin-btn"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold text-gray-900 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <GoogleIcon />
                  {loading ? "Redirecting to Google…" : "Sign in with Google"}
                </button>

                <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                  Use your <strong className="text-gray-300">@kiet.edu</strong> Google account.
                  Personal Gmail accounts will be rejected.
                </p>

                <div className="relative flex items-center gap-3 my-2">
                  <div className="flex-1 border-t border-white/10"></div>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">or</span>
                  <div className="flex-1 border-t border-white/10"></div>
                </div>

                <button
                  onClick={() => { setAuthMode("otp"); setError(""); }}
                  className="w-full text-center text-xs text-gray-400 hover:text-white transition-colors py-1"
                >
                  Use Email OTP instead →
                </button>
              </div>
            )}

            {/* ── Email OTP (Fallback) ──────────────────────────────────────── */}
            {authMode === "otp" && (
              <div className="space-y-4">
                {otpStep === "email" ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-300">KIET Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          required
                          placeholder="username@kiet.edu"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316] transition-colors"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#f97316] hover:bg-[#ea580c] transition-colors disabled:opacity-50"
                    >
                      {loading ? "Sending code…" : "Send OTP Code"}
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="p-3 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-xs">
                      Code sent to <strong>{email}</strong>. Check your inbox.
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-300">6-Digit Code</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          pattern="[0-9]{6}"
                          placeholder="123456"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white tracking-[0.4em] font-bold placeholder-gray-500 focus:outline-none focus:border-[#10b981] transition-colors"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#10b981] hover:bg-[#059669] transition-colors disabled:opacity-50"
                    >
                      {loading ? "Verifying…" : "Verify & Log In"}
                      <ShieldCheck className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpStep("email")}
                      className="w-full text-center text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      ← Change email
                    </button>
                  </form>
                )}

                <button
                  onClick={() => { setAuthMode("google"); setOtpStep("email"); setError(""); }}
                  className="w-full text-center text-xs text-gray-400 hover:text-white transition-colors py-1"
                >
                  ← Back to Google Sign-In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-[#060a17]">
          <div className="h-8 w-8 rounded-full border-2 border-[#f97316] border-t-transparent animate-spin" />
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
