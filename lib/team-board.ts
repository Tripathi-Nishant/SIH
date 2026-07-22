export type TeamTaskStatus = "idea" | "doing" | "done";

export interface TeamTask {
  id: string;
  title: string;
  status: TeamTaskStatus;
  created_at: string;
}

const keyFor = (teamId: string) => `sih_team_board:${teamId}`;

function readTasks(teamId: string): TeamTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(teamId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTasks(teamId: string, tasks: TeamTask[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyFor(teamId), JSON.stringify(tasks));
}

export function getTeamBoardTasks(teamId: string): TeamTask[] {
  return readTasks(teamId);
}

export function addTeamBoardTask(teamId: string, title: string): TeamTask[] {
  const next: TeamTask[] = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      status: "idea",
      created_at: new Date().toISOString(),
    },
    ...readTasks(teamId),
  ];
  writeTasks(teamId, next);
  return next;
}

export function updateTeamBoardTask(teamId: string, taskId: string, status: TeamTaskStatus): TeamTask[] {
  const next = readTasks(teamId).map((task) => (task.id === taskId ? { ...task, status } : task));
  writeTasks(teamId, next);
  return next;
}

export function deleteTeamBoardTask(teamId: string, taskId: string): TeamTask[] {
  const next = readTasks(teamId).filter((task) => task.id !== taskId);
  writeTasks(teamId, next);
  return next;
}
