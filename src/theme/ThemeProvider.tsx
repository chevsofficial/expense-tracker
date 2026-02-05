"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type SpendaryTheme = "spendaryLight" | "spendaryDark";

const ThemeContext = createContext<{
  theme: SpendaryTheme;
  setTheme: (theme: SpendaryTheme) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<SpendaryTheme>("spendaryLight");

  useEffect(() => {
    const stored = localStorage.getItem("spendary-theme") as SpendaryTheme | null;
    if (stored === "spendaryLight" || stored === "spendaryDark") {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("spendary-theme", theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useSpendaryTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useSpendaryTheme must be used within ThemeProvider");
  return ctx;
}
