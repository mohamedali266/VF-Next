"use client";

import ThemeProvider from "@/components/theme/ThemeProvider";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
