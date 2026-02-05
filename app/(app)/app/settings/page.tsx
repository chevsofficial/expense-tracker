"use client";

import { useSpendaryTheme } from "@/src/theme/ThemeProvider";

export default function SettingsPage() {
  const { theme, setTheme } = useSpendaryTheme();

  return (
    <main className="space-y-6 p-6 bg-base-100 text-base-content">
      <h1 className="text-3xl font-bold text-neutral">Settings</h1>

      <div className="card bg-base-100 shadow">
        <div className="card-body space-y-3">
          <h2 className="text-lg font-semibold text-neutral">Theme</h2>

          <div className="join">
            <button
              className={`btn join-item ${theme === "spendaryLight" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setTheme("spendaryLight")}
              type="button"
            >
              Light
            </button>
            <button
              className={`btn join-item ${theme === "spendaryDark" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setTheme("spendaryDark")}
              type="button"
            >
              Dark
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
