import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  IBM_Plex_Sans,
  Space_Grotesk,
  JetBrains_Mono,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";
import { SitePreferences } from "@/components/site-preferences";
import { appearanceBootstrap } from "@/lib/preferences";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--preview-inter",
  preload: false,
});
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--preview-plex",
  weight: ["400", "500", "600"],
  preload: false,
});
const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--preview-space",
  preload: false,
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--preview-jetbrains",
  preload: false,
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--preview-plex-mono",
  weight: ["400", "500"],
  preload: false,
});
// Set SITE_URL to the deployed origin. Never derive social URLs from a Host header.
const siteOrigin = process.env.SITE_URL || "http://localhost:5173";
const socialImage = {
  url: new URL("/og.png", siteOrigin).href,
  width: 1731,
  height: 909,
  alt: "ThemeSpace — Design once. Yours everywhere.",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "ThemeSpace — One theme. Yours everywhere.",
  description:
    "Create a personal theme for your apps, terminals, browsers, and web projects. Preview, remix, and export your design system.",
  openGraph: {
    title: "ThemeSpace",
    description: "Design once. Make it yours everywhere.",
    type: "website",
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "ThemeSpace",
    description: "Design once. Make it yours everywhere.",
    images: [socialImage.url],
  },
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${plex.variable} ${space.variable} ${jetbrains.variable} ${plexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootstrap }} />
      </head>
      <body className="antialiased">
        <SitePreferences>{children}</SitePreferences>
      </body>
    </html>
  );
}
