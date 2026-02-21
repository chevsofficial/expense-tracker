"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type SpendaryTheme = "spendaryLight" | "spendaryDark";
const STORAGE_KEY = "spendary-theme";

type ThemeContextValue = {
  theme: SpendaryTheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  setTheme: (theme: SpendaryTheme) => void;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(preference: ThemePreference): SpendaryTheme {
  if (preference === "light") return "spendaryLight";
  if (preference === "dark") return "spendaryDark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "spendaryDark" : "spendaryLight";
}

function applyTheme(theme: SpendaryTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function readStoredPreference(): ThemePreference | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "system" || raw === "light" || raw === "dark" ? raw : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    return readStoredPreference() ?? "system";
  });
  const [theme, setThemeState] = useState<SpendaryTheme>("spendaryLight");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyFromPreference = () => setThemeState(resolveTheme(preference));

    applyFromPreference();
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // ignore
    }

    if (preference === "system") {
      media.addEventListener("change", applyFromPreference);
      return () => media.removeEventListener("change", applyFromPreference);
    }

    return;
  }, [preference]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const setTheme = useCallback((next: SpendaryTheme) => {
    setPreferenceState(next === "spendaryDark" ? "dark" : "light");
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferenceState((prev) => {
      if (prev === "system") return "dark";
      return prev === "light" ? "dark" : "light";
    });
  }, []);

  const value = useMemo(
    () => ({ theme, preference, setPreference, setTheme, toggleTheme }),
    [theme, preference, setPreference, setTheme, toggleTheme]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
