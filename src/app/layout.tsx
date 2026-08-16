import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const SITE_URL = "https://vf-next-delta.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VF-Next — Vodafone Operations System",
    template: "%s | VF-Next",
  },
  description: "نظام إدارة عمليات فودافون - التقارير اليومية وتجميع SMS وتتبع الشفتات ومتابعة العملاء",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/vf-icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "VF-Next — Vodafone Operations System",
    description: "نظام إدارة عمليات فودافون - التقارير اليومية وتجميع SMS وتتبع الشفتات ومتابعة العملاء",
    url: SITE_URL,
    siteName: "VF-Next",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "VF-Next Logo",
      },
    ],
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VF-Next — Vodafone Operations System",
    description: "نظام إدارة عمليات فودافون - التقارير اليومية وتجميع SMS وتتبع الشفتات ومتابعة العملاء",
    images: [`${SITE_URL}/og-image.png`],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VF-Next",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#C41E3A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="website" />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
      </head>
      <body className={cairo.variable} style={{ fontFamily: "var(--font-cairo), system-ui" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
