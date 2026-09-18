"use client";

import { createContext, useContext, ReactNode, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getSnapshot(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("theme") as Theme | null) ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    (callback) => {
      window.addEventListener("storage", callback);
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", callback);
      return () => {
        window.removeEventListener("storage", callback);
        mediaQuery.removeEventListener("change", callback);
      };
    },
    getSnapshot,
    getServerSnapshot
  );

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    window.dispatchEvent(new Event("storage"));
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}