"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MockDB, Profile } from "@/lib/db";
import { isAdminUser } from "@/lib/admin";
import {
  LogOut,
  Users,
  Search,
  Award,
  ShieldAlert,
  AlertTriangle,
  Menu,
  X as CloseIcon,
  LayoutDashboard,
  UserCircle,
  Bell,
  BookOpen,
  ChevronDown,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";

type MenuItem = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  external?: boolean;
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    MockDB.getCurrentUser().then(setUser);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      MockDB.getCurrentUser().then(setUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  };

  const isAdmin = isAdminUser(user);
  const reportIssueUrl =
    "https://mail.google.com/mail/?view=cm&fs=1&to=tripathinishant498@gmail.com&su=SIH%20Team%20Finder%20Issue";

  const navItems: MenuItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Activity", href: "/notifications", icon: Bell },
    { name: "Browse", href: "/browse", icon: Search },
    { name: "Team Finder", href: "/teams", icon: Users },
  ];

  const moreItems: MenuItem[] = [
    { name: "Mentors", href: "/mentors", icon: BookOpen },
    { name: "My Profile", href: "/profile", icon: UserCircle },
    { name: "Hall of Fame", href: "/hall-of-fame", icon: Award },
    ...(isAdmin || user?.role === "faculty"
      ? [{ name: "Mentor Hub", href: "/mentors/dashboard", icon: Sparkles }]
      : []),
    ...(isAdmin ? [{ name: "Admin Panel", href: "/admin", icon: ShieldAlert }] : []),
    { name: "Report Issue", href: reportIssueUrl, icon: AlertTriangle, external: true },
  ];

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.kiet_email?.charAt(0).toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#080f25]/92 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <div className="h-[4px] w-full flex">
        <div className="h-full w-1/3 bg-[#f97316]" title="Saffron" />
        <div className="h-full w-1/3 bg-white" title="White" />
        <div className="h-full w-1/3 bg-[#10b981]" title="Green" />
      </div>

      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2.5 lg:py-3">
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#f97316] via-[#ff9a4d] to-[#002d62] text-white font-black text-lg shadow-lg border border-white/10 shrink-0">
              SIH
            </div>
            <div className="min-w-0">
              <span className="font-black tracking-tight text-white block text-xs sm:text-sm xl:text-base leading-tight">
                KIET SIH <span className="text-[#f97316]">Team Finder</span>
              </span>
              <span className="text-[10px] text-gray-400 block -mt-0.5 hidden md:block">
                Official Hackathon Portal
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center justify-center px-2 min-w-0">
            <div className="flex items-center gap-2 xl:gap-2.5 whitespace-nowrap min-w-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-full text-xs xl:text-sm font-semibold transition-colors shrink-0 whitespace-nowrap border ${
                      isActive
                        ? "text-[#f97316] bg-[#f97316]/12 border-[#f97316]/15"
                        : "text-gray-300 border-transparent hover:text-white hover:bg-white/5 hover:border-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen((open) => !open)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-full text-xs xl:text-sm font-semibold transition-colors border ${
                    moreMenuOpen
                      ? "text-white bg-white/10 border-white/10"
                      : "text-gray-300 border-transparent hover:text-white hover:bg-white/5 hover:border-white/5"
                  }`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  More
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {moreMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 rounded-3xl border border-white/10 bg-[#0b1330]/98 shadow-2xl overflow-hidden backdrop-blur-xl">
                    {moreItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      const itemClass = `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        isActive
                          ? "bg-[#f97316]/10 text-[#f97316]"
                          : "text-gray-200 hover:bg-white/5 hover:text-white"
                      }`;

                      if (item.external) {
                        return (
                          <a
                            key={item.href}
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className={itemClass}
                          >
                            <Icon className="h-4 w-4" />
                            {item.name}
                          </a>
                        );
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreMenuOpen(false)}
                          className={itemClass}
                        >
                          <Icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3 rounded-full border border-white/8 bg-white/5 px-2.5 py-1.5">
                <Link href="/profile" className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.name || "User"}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full border border-white/20 object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-[#f97316]/20 border border-[#f97316]/50 flex items-center justify-center text-[#f97316] text-sm font-bold">
                      {userInitial}
                    </div>
                  )}
                  <div className="hidden xl:block text-left max-w-[160px]">
                    <span className="block text-xs font-semibold text-white truncate">
                      {user.name || "Complete Profile"}
                    </span>
                    <span className="block text-[10px] text-gray-400 truncate">
                      {user.branch ? `${user.branch} · Year ${user.year}` : user.kiet_email}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-full text-gray-300 border border-white/5 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/20 transition-colors shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/"
                className="px-4 py-2 rounded-full text-xs font-semibold bg-[#f97316] text-white hover:bg-[#ea580c] transition-colors"
              >
                Login
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0 border border-white/5"
            >
              {mobileMenuOpen ? <CloseIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#080f25] px-4 pt-3 pb-4 space-y-2 max-h-[70vh] overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "text-[#f97316] bg-[#f97316]/10"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}

          <Link
            href="/mentors"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
              pathname === "/mentors"
                ? "text-[#f97316] bg-[#f97316]/10"
                : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Mentors
          </Link>

          <Link
            href="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
              pathname === "/profile"
                ? "text-[#f97316] bg-[#f97316]/10"
                : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <UserCircle className="h-4 w-4" />
            My Profile
          </Link>

          <Link
            href="/hall-of-fame"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
              pathname === "/hall-of-fame"
                ? "text-[#f97316] bg-[#f97316]/10"
                : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Award className="h-4 w-4" />
            Hall of Fame
          </Link>

          {isAdmin || user?.role === "faculty" ? (
            <Link
              href="/mentors/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                pathname === "/mentors/dashboard"
                  ? "text-[#10b981] bg-[#10b981]/10"
                  : "text-gray-300 hover:text-[#10b981]"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Mentor Hub
            </Link>
          ) : null}

          {isAdmin ? (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                pathname === "/admin"
                  ? "text-[#eab308] bg-[#eab308]/10"
                  : "text-gray-300 hover:text-[#eab308]"
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              Admin Panel
            </Link>
          ) : null}

          <a
            href={reportIssueUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <AlertTriangle className="h-4 w-4" />
            Report Issue
          </a>

          {mobileMenuOpen && user ? (
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          ) : null}
        </div>
      )}
    </header>
  );
}
