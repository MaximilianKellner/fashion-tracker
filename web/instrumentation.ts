// Wird einmal beim Serverstart ausgeführt: meldet die Git-Sync-Einstellungen (GIT_AUTOSYNC=1)
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logSyncConfig } = await import("@lib/git-sync.mjs");
  logSyncConfig();
}
