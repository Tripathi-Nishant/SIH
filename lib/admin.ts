import type { Profile } from "./db";

export function isAdminUser(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return profile.role === "admin";
}

export function isFacultyUser(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return profile.role === "faculty";
}
