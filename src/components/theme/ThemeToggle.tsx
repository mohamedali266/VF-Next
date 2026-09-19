"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      className="vf-theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
    >
      <span className="vf-theme-toggle-track" aria-hidden="true">
        <span className="vf-theme-toggle-thumb">
          {isLight ? <Sun size={15} /> : <Moon size={15} />}
        </span>
      </span>
    </button>
  );
}
