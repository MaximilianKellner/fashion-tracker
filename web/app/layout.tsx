import type { Metadata, Viewport } from "next";
// Schrift aus dem npm-Paket statt von Google Fonts: der Build braucht so kein Internet (z. B. im Nix-Sandbox-Build)
import { GeistSans } from "geist/font/sans";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { PageTransition } from "@/components/page-transition";
import { UpdateNotice } from "@/components/update-notice";
import { filterOpenScript } from "@/lib/filter-open";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kleiderschrank",
  description: "Kleidung erfassen, Outfits speichern, Wunschliste und Statistiken",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#141311" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" suppressHydrationWarning data-scroll-behavior="smooth" className={`${GeistSans.variable} h-full antialiased motion-safe:scroll-smooth`}>
      <head>
        {/* Vor dem ersten Zeichnen: Filter-Panel offen, wenn „aufgeklappt lassen“ gesetzt ist (siehe FilterKeepOpen) */}
        <script dangerouslySetInnerHTML={{ __html: filterOpenScript }} />
      </head>
      <body className="min-h-full font-sans">
        <Nav />
        {/* Unten Platz für die mobile Navigationsleiste lassen */}
        <main className="mx-auto w-full max-w-5xl px-4 pb-6 pt-2 sm:pt-6">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
        <UpdateNotice />
      </body>
    </html>
  );
}
