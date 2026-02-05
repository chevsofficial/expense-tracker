"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

export type SpendaryTheme = "spendaryLight" | "spendaryDark";
const STORAGE_KEY = "spendary-theme";

type ThemeContextValue = {
  theme: SpendaryTheme;
  setTheme: (theme: SpendaryTheme) => void;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: SpendaryTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function readStoredTheme(): SpendaryTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "spendaryLight" || raw === "spendaryDark" ? raw : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<SpendaryTheme>(() => {
    if (typeof window === "undefined") return "spendaryLight";
    return readStoredTheme() ?? "spendaryLight";
  });

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const setTheme = useCallback((next: SpendaryTheme) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "spendaryLight" ? "spendaryDark" : "spendaryLight"));
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
