// Wird einmal beim Serverstart ausgeführt: meldet Speicher und Git-Abgleich (GIT_AUTOSYNC, CODE_AUTOUPDATE)
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logSyncConfig } = await import("@lib/git-sync.mjs");
  logSyncConfig();
}
