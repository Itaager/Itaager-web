import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SetupRequired } from "@/components/setup-required";
import { THEME_SCRIPT } from "@/components/theme-toggle";
import { isSupabaseConfigured, siteUrl } from "@/lib/supabase/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Itaager — Support the creators you love", template: "%s · Itaager" },
  description:
    "Itaager lets Somali creators, developers, artists and educators receive support from their audience through EVC Plus.",
  openGraph: { siteName: "Itaager", type: "website" },
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
