export function getRequiredEnv(name: string): string {
  return process.env[name]?.trim() || "";
}
