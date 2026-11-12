// Version des Builds, der gerade läuft. Offene Tabs fragen sie ab und bieten nach einem Update das Neuladen an.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ version: process.env.APP_VERSION }, { headers: { "Cache-Control": "no-store" } });
}
