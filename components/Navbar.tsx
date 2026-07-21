"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MockDB, Profile } from "@/lib/db";
import { isAdminUser } from "@/lib/admin";
import { LogOut, User, Users, Search, Award, ShieldAlert, AlertTriangle, Menu, X as CloseIcon } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Load user from Supabase Auth + profile table
    MockDB.getCurrentUser().then(setUser);

    // Keep in sync with auth state changes (e.g. sign-out in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      MockDB.getCurrentUser().then(setUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Users },
    { name: "Browse", href: "/browse", icon: Search },
    { name: "Hall of Fame", href: "/hall-of-fame", icon: Award },
  ];

  const isAdmin = isAdminUser(user);

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.kiet_email?.charAt(0).toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#080f25]/90 backdrop-blur-md">
      {/* Tricolor SIH Accent Strip */}
      <div className="h-[4px] w-full flex">
        <div className="h-full w-1/3 bg-[#f97316]" title="Saffron"></div>
        <div className="h-full w-1/3 bg-white" title="White"></div>
        <div className="h-full w-1/3 bg-[#10b981]" title="Green"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-tr from-[#f97316] to-[#002d62] text-white font-bold text-lg shadow-md border border-white/10">
              SIH
            </div>
            <div>
              <span className="font-bold tracking-tight text-white block text-sm sm:text-base">
                KIET SIH <span className="text-[#f97316]">Team Finder</span>
              </span>
              <span className="text-[10px] text-gray-400 block -mt-1">
                Official Hackathon Portal
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                      ? "text-[#f97316] bg-[#f97316]/10"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === "/admin"
                    ? "text-[#eab308] bg-[#eab308]/10"
                    : "text-gray-300 hover:text-[#eab308] hover:bg-[#eab308]/5"
                  }`}
              >
                <ShieldAlert className="h-4 w-4" />
                Admin Panel
              </Link>
            )}
            <a
              href="mailto:tripathinishant498@gmail.com"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Report Issue
            </a>
          </nav>

          {/* User Session Profile */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden lg:block text-right">
                  <span className="block text-xs font-semibold text-white">
                    {user.name || "Complete Profile"}
                  </span>
                  <span className="block text-[10px] text-gray-400">
                    {user.branch ? `${user.branch} • Year ${user.year}` : user.kiet_email}
                  </span>
                </div>

                {/* Avatar: Google profile picture or initials */}
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

                <button
                  onClick={handleLogout}
                  className="hidden md:block p-2 text-gray-400 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/"
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#f97316] text-white hover:bg-[#ea580c] transition-colors"
              >
                Login
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {mobileMenuOpen ? <CloseIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#080f25] px-4 pt-2 pb-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                    ? "text-[#f97316] bg-[#f97316]/10"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === "/admin"
                  ? "text-[#eab308] bg-[#eab308]/10"
                  : "text-gray-300 hover:text-[#eab308]"
                }`}
            >
              <ShieldAlert className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
          <a
            href="mailto:sih-support@kiet.edu?subject=SIH%20Team%20Finder%20Feedback"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            <AlertTriangle className="h-4 w-4" /> Report Issue
          </a>
          {user && (
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
