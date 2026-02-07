"use client";

import { useContext, useState } from "react";
import type { Locale } from "@/src/i18n/messages";
import { ThemeContext } from "@/src/theme/ThemeProvider";
import { LanguageToggle } from "@/components/LanguageToggle";

export function SettingsGeneralClient({ locale }: { locale: Locale }) {
  const theme = useContext(ThemeContext);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other" | "">("");
  const [dob, setDob] = useState("");

  const email = "user@email.com";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">General</h1>

      <div className="card bg-base-200 border border-base-300">
        <div className="card-body space-y-4">
          <h2 className="font-semibold">Account Settings</h2>

          <div className="flex items-center gap-4">
            <div className="avatar placeholder">
              <div className="bg-base-300 text-base-content rounded-full w-14">
                <span>👤</span>
              </div>
            </div>
            <input type="file" className="file-input file-input-bordered w-full max-w-xs" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="form-control">
              <div className="label">
                <span className="label-text">First name</span>
              </div>
              <input
                className="input input-bordered"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text">Last name</span>
              </div>
              <input
                className="input input-bordered"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text">Sex</span>
              </div>
              <select
                className="select select-bordered"
                value={sex}
                onChange={(e) => setSex(e.target.value as "male" | "female" | "other" | "")}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text">Date of birth</span>
              </div>
              <input
                className="input input-bordered"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </label>
          </div>

          <div className="divider" />

          <div className="flex flex-col gap-2">
            <div className="text-sm opacity-70">Email</div>
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{email}</div>
              <button className="btn btn-outline btn-sm" type="button">
                Change email
              </button>
            </div>
          </div>

          <div className="divider" />

          <button className="btn btn-error btn-outline w-fit" type="button">
            Delete account
          </button>
        </div>
      </div>

      <div className="card bg-base-200 border border-base-300">
        <div className="card-body">
          <h2 className="font-semibold">Language</h2>
          <p className="opacity-70 text-sm">Choose your preferred language.</p>

          <LanguageToggle locale={locale} />
        </div>
      </div>

      <div className="card bg-base-200 border border-base-300">
        <div className="card-body">
          <h2 className="font-semibold">Theme</h2>
          <div className="flex items-center justify-between">
            <span className="opacity-70 text-sm">Light / Dark</span>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => theme?.toggleTheme()}
              type="button"
            >
              Toggle theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
