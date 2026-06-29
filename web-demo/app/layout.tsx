import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AAROP — Agentic Loop Live Demo · Devayan Mandal",
  description:
    "Live, interactive walk-through of an autonomous multi-agent reasoning loop (Perceive → Plan → Act → Observe → Reflect → Adapt). Built by Devayan Mandal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
