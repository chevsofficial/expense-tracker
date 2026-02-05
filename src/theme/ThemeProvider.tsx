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
    if (raw === "spendaryLight" || raw === "spendaryDark") return raw;
    return null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<SpendaryTheme>("spendaryLight");

  useEffect(() => {
    const stored = readStoredTheme();
    const initial = stored ?? "spendaryLight";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((next: SpendaryTheme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "spendaryLight" ? "spendaryDark" : "spendaryLight");
  }, [setTheme, theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
