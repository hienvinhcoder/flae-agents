import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://flae.ai"),
  title: "FLAE — AI Company Memory & MCP Knowledge Graph",
  description:
    "FLAE turns scattered enterprise documents, Notion, Slack, Google Drive, and GitHub repositories into a continuously synchronized knowledge layer. Query with sub-second latency through the Model Context Protocol (MCP) in Claude Code, Cursor, and AI agents.",
  keywords: [
    "AI Company Memory",
    "Model Context Protocol",
    "MCP Server",
    "Knowledge Graph",
    "TGS-RAG",
    "Claude Code Context",
    "Cursor AI",
    "Enterprise Knowledge Base",
  ],
  authors: [{ name: "FLAE Team" }],
  openGraph: {
    title: "FLAE — AI Company Memory & MCP Knowledge Graph",
    description:
      "Continuous enterprise memory and bi-directionally verified knowledge graphs for AI agents.",
    url: "https://flae.ai",
    siteName: "FLAE",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FLAE — AI Company Memory Layer",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FLAE — AI Company Memory Layer",
    description:
      "Transform scattered enterprise tools into an active, verified knowledge graph for your AI agents.",
    creator: "@flae_ai",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#141009",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import { LanguageProvider } from "../i18n/I18nContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable} dark`}
    >
      <body className="min-h-screen bg-(--flae-canvas) text-(--flae-ink) antialiased font-sans flex flex-col selection:bg-(--flae-primary-soft) selection:text-white">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
