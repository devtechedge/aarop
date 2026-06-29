import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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

// Set the theme before first paint to avoid a flash of the wrong theme.
const noFlashScript = `
(function() {
  try {
    var stored = localStorage.getItem('aarop-theme');
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var theme = stored || system;
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
