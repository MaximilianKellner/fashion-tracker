// Wird einmal beim Serverstart ausgeführt: startet den Git-Abgleich, falls GIT_AUTOSYNC=1 gesetzt ist
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startPeriodicSync } = await import("@lib/git-sync.mjs");
  startPeriodicSync(Number(process.env.GIT_SYNC_MINUTES) || 5);
}
