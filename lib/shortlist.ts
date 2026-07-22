const teamKey = (userId: string) => `sih_shortlisted_teams:${userId}`;
const studentKey = (userId: string) => `sih_shortlisted_students:${userId}`;

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(new Set(ids))));
}

export function getSavedTeams(userId: string): string[] {
  return readList(teamKey(userId));
}

export function toggleSavedTeam(userId: string, teamId: string): boolean {
  const key = teamKey(userId);
  const current = readList(key);
  const exists = current.includes(teamId);
  const next = exists ? current.filter((id) => id !== teamId) : [...current, teamId];
  writeList(key, next);
  return !exists;
}

export function isTeamSaved(userId: string, teamId: string): boolean {
  return readList(teamKey(userId)).includes(teamId);
}

export function getSavedStudents(userId: string): string[] {
  return readList(studentKey(userId));
}

export function toggleSavedStudent(userId: string, studentId: string): boolean {
  const key = studentKey(userId);
  const current = readList(key);
  const exists = current.includes(studentId);
  const next = exists ? current.filter((id) => id !== studentId) : [...current, studentId];
  writeList(key, next);
  return !exists;
}

export function isStudentSaved(userId: string, studentId: string): boolean {
  return readList(studentKey(userId)).includes(studentId);
}
