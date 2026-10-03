import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
    <html lang="de" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Nav />
        {/* Unten Platz für die mobile Navigationsleiste lassen */}
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-2 sm:pb-10 sm:pt-6">{children}</main>
      </body>
    </html>
  );
}
