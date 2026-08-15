import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VF-Next",
  description: "Daily reports, SMS aggregation, health checks, and team management",
  manifest: "/manifest.json",
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
      </head>
      <body className={cairo.variable} style={{ fontFamily: "var(--font-cairo), system-ui" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
