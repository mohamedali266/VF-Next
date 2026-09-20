"use client";

import GlobalRouteLoader from "@/components/layout/VodafoneLoader";
import ThemeProvider from "@/components/theme/ThemeProvider";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <GlobalRouteLoader />
    </ThemeProvider>
  );
}
