import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SetupRequired } from "@/components/setup-required";
import { THEME_SCRIPT } from "@/components/theme-toggle";
import { isSupabaseConfigured, siteUrl } from "@/lib/supabase/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const DESCRIPTION =
  "Itaager is a Somali creator-support platform. Fans support creators, developers, artists, writers and educators with small payments using EVC Plus mobile money — no card needed.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Itaager — Support Somali creators with EVC Plus", template: "%s · Itaager" },
  description: DESCRIPTION,
  applicationName: "Itaager",
  keywords: [
    "Itaager", "itaager.com", "support Somali creators", "Somali creators", "buy me a coffee Somalia",
    "EVC Plus", "Hormuud", "creator support", "donate to creators", "tip creators Somalia",
  ],
  openGraph: { siteName: "Itaager", type: "website", url: "/", title: "Itaager — Support the creators you love", description: DESCRIPTION, locale: "en_US" },
  twitter: { card: "summary_large_image", title: "Itaager — Support the creators you love", description: DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme is set by THEME_SCRIPT before hydration, hence suppressHydrationWarning.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">{isSupabaseConfigured ? children : <SetupRequired />}</body>
    </html>
  );
}
