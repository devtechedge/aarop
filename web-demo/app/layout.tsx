import type { Metadata } from "next";
import "./globals.css";

const description =
  "Live, interactive walk-through of an autonomous multi-agent reasoning loop (Perceive → Plan → Act → Observe → Reflect → Adapt). Built by Devayan Mandal.";

export const metadata: Metadata = {
  title: "AAROP — Agentic Loop Live Demo · Devayan Mandal",
  description,
  metadataBase: new URL("https://aarop.vercel.app"),
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "AAROP — Agentic Loop Live Demo",
    description,
    url: "https://aarop.vercel.app",
    siteName: "AAROP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AAROP — Agentic Loop Live Demo",
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
