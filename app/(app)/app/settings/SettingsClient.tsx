"use client";

import { useContext } from "react";
import { ThemeContext } from "@/src/theme/ThemeProvider";

export function SettingsClient() {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    return <div className="p-4">Theme provider not available.</div>;
  }

  const { theme, toggleTheme } = ctx;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-3xl font-bold">Settings</h1>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Theme</p>
              <p className="text-sm opacity-70">Light / Dark</p>
            </div>

            <button className="btn btn-primary" onClick={toggleTheme} type="button">
              {theme === "spendaryLight" ? "Switch to Dark" : "Switch to Light"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
