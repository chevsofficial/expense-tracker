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

function readStoredTheme(): SpendaryTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "spendaryLight" || raw === "spendaryDark") return raw;
    return null;
  } catch {
    return null;
  }
}

function applyTheme(theme: SpendaryTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<SpendaryTheme>(() => {
    if (typeof window === "undefined") return "spendaryLight";
    const stored = readStoredTheme();
    return stored ?? "spendaryLight";
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
