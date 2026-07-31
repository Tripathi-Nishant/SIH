"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { MockDB, Profile, Request, Team } from "@/lib/db";
import { getSavedStudents, getSavedTeams } from "@/lib/shortlist";
import { Bell, Bookmark, CheckCircle2, Clock3, Mail, ShieldAlert, Users, ArrowRight } from "lucide-react";

type FeedItem = {
  id: string;
  title: string;
  detail: string;
  href?: string;
  tone: "orange" | "green" | "blue" | "slate" | "red";
};
type PortalNotification = { id: string; title: string; message: string; href?: string; read_at?: string | null; created_at: string };

export default function NotificationsPage() {
  const [user, setUser] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedTeams, setSavedTeams] = useState<string[]>([]);
  const [savedStudents, setSavedStudents] = useState<string[]>([]);
  const [portalNotifications, setPortalNotifications] = useState<PortalNotification[]>([]);

  const loadData = async () => {
    setLoading(true);
    const [currentUser, teamsData, requestsData] = await Promise.all([
      MockDB.getCurrentUser(),
      MockDB.getTeams(),
      MockDB.getRequests(),
    ]);

    setUser(currentUser);
    setTeams(teamsData);
    setRequests(requestsData);
    const notificationResponse = await fetch("/api/notifications");
    const notificationData = await notificationResponse.json().catch(() => ({}));
    setPortalNotifications(notificationData.notifications || []);

    if (currentUser) {
      setSavedTeams(getSavedTeams(currentUser.id));
      setSavedStudents(getSavedStudents(currentUser.id));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const teamNameMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams]
  );

  const feed = useMemo<FeedItem[]>(() => {
    if (!user) return [];

    const recentRequests = requests
      .filter((request) => request.sender_id === user.id || request.receiver_id === user.id)
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
      .slice(0, 10)
      .map((request) => {
        const isIncoming = request.receiver_id === user.id;
        const teamName = teamNameMap.get(request.team_id) || "a team";
        const title =
          request.status === "pending"
            ? isIncoming
              ? "New team invite"
              : "Request sent"
            : request.status === "accepted"
              ? "Request accepted"
              : request.status === "rejected"
                ? "Request rejected"
                : "Request updated";

        const detail =
          request.status === "pending"
            ? isIncoming
              ? `You have a pending invite for ${teamName}.`
              : `Your join request for ${teamName} is pending.`
            : request.status === "accepted"
              ? `Your request for ${teamName} was accepted.`
              : request.status === "rejected"
                ? `Your request for ${teamName} was rejected.`
                : `An update was made on ${teamName}.`;

        return {
          id: request.id,
          title,
          detail,
          href: `/dashboard`,
          tone: (request.status === "accepted" ? "green" : request.status === "rejected" ? "red" : "orange") as FeedItem["tone"],
        };
      });

    const savedTeamItems: FeedItem[] = savedTeams
      .map((teamId) => teamNameMap.get(teamId))
      .filter(Boolean)
      .map((teamName, index) => ({
        id: `saved-team-${index}`,
        title: "Saved team",
        detail: `${teamName} is in your shortlist.`,
        href: "/teams",
        tone: "blue" as const,
      }));

    const savedStudentItems: FeedItem[] = savedStudents.slice(0, 5).map((studentId, index) => ({
      id: `saved-student-${index}`,
      title: "Saved student",
      detail: `You bookmarked a student profile for later review.`,
      href: "/browse",
      tone: "slate" as const,
    }));

    return [...recentRequests, ...savedTeamItems, ...savedStudentItems]
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 14);
  }, [requests, savedTeams, savedStudents, teamNameMap, user]);

  const stats = [
    { label: "Pending requests", value: requests.filter((r) => r.status === "pending").length, icon: Mail },
    { label: "Saved teams", value: savedTeams.length, icon: Bookmark },
    { label: "Saved students", value: savedStudents.length, icon: Users },
    { label: "Active items", value: feed.length + portalNotifications.filter((item) => !item.read_at).length, icon: Bell },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060a17]">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="h-48 rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a17] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="glass rounded-3xl border border-white/10 p-6 md:p-8 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/10 via-transparent to-[#f97316]/10 pointer-events-none" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-300">
                <Bell className="h-3.5 w-3.5 text-[#10b981]" />
                Activity Center
              </span>
              <h1 className="text-3xl md:text-4xl font-black text-white mt-4">Track requests, saved items, and updates.</h1>
              <p className="text-sm text-gray-400 mt-3 max-w-2xl">
                A lightweight notification hub built from your actual team, request, and shortlist data.
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea580c] transition-colors"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass rounded-2xl border border-white/10 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{stat.label}</span>
                  <Icon className="h-4 w-4 text-[#f97316]" />
                </div>
                <div className="text-3xl font-black text-white mt-2">{stat.value}</div>
              </div>
            );
          })}
        </section>

        {portalNotifications.length > 0 && <section className="glass rounded-2xl border border-purple-500/20 p-6"><h2 className="text-lg font-bold text-white">Portal notifications</h2><div className="mt-4 space-y-2">{portalNotifications.slice(0, 8).map((notification) => <Link key={notification.id} href={notification.href || "/notifications"} onClick={() => { if (!notification.read_at) fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: notification.id }) }); }} className={`block rounded-xl border p-3 ${notification.read_at ? "border-white/5 bg-white/5" : "border-purple-400/20 bg-purple-500/10"}`}><strong className="block text-sm text-white">{notification.title}</strong><span className="text-xs text-gray-400">{notification.message}</span></Link>)}</div></section>}

        <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr] gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
              <span className="text-xs text-gray-400">{feed.length} items</span>
            </div>

            {feed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
                No activity yet. Join a team, send a request, or save a few items to populate this view.
              </div>
            ) : (
              <div className="space-y-3">
                {feed.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center border ${
                          item.tone === "green"
                            ? "bg-green-500/10 border-green-500/20 text-green-300"
                            : item.tone === "red"
                              ? "bg-red-500/10 border-red-500/20 text-red-300"
                              : item.tone === "blue"
                                ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                                : item.tone === "orange"
                                  ? "bg-[#f97316]/10 border-[#f97316]/20 text-[#f97316]"
                                  : "bg-white/5 border-white/10 text-gray-300"
                        }`}
                      >
                        {item.tone === "green" ? <CheckCircle2 className="h-4 w-4" /> : item.tone === "red" ? <ShieldAlert className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{item.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">{item.detail}</p>
                      </div>
                    </div>

                    {item.href && (
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-gray-200 hover:bg-white/10 transition-colors"
                      >
                        Open
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="glass rounded-2xl border border-white/10 p-5">
              <h2 className="text-sm font-bold text-white">Shortlist Summary</h2>
              <div className="mt-4 space-y-3 text-sm text-gray-400">
                <div className="flex items-center justify-between">
                  <span>Saved teams</span>
                  <span className="text-white font-semibold">{savedTeams.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Saved students</span>
                  <span className="text-white font-semibold">{savedStudents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pending inbox items</span>
                  <span className="text-white font-semibold">{requests.filter((r) => r.status === "pending").length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#10b981]/20 bg-[#10b981]/5 p-5 text-sm text-green-100">
              Use the shortlist to revisit strong matches later without losing them in the browse feed.
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
