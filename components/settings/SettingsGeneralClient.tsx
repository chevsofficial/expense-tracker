"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/src/i18n/messages";
import { ThemeContext } from "@/src/theme/ThemeProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getJSON, putJSON } from "@/src/lib/apiClient";
import { SUPPORTED_CURRENCIES } from "@/src/constants/currencies";
import { getWorkspaceCurrency } from "@/src/lib/currency";

type SettingsResponse = { data: { defaultCurrency: string } };

export function SettingsGeneralClient({
  locale,
  defaultCurrency,
}: {
  locale: Locale;
  defaultCurrency: string;
}) {
  const router = useRouter();
  const theme = useContext(ThemeContext);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other" | "">("");
  const [dob, setDob] = useState("");
  const [currency, setCurrency] = useState(() => getWorkspaceCurrency({ defaultCurrency }));
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [currencyError, setCurrencyError] = useState<string | null>(null);

  const email = "user@email.com";

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const response = await getJSON<SettingsResponse>("/api/settings/general");
        if (isMounted) {
          setCurrency(getWorkspaceCurrency({ defaultCurrency: response.data.defaultCurrency }));
        }
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : "Unable to load settings.";
          setCurrencyError(message);
        }
      }
    };
    void loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCurrencyChange = async (nextCurrency: string) => {
    setCurrency(nextCurrency);
    setSavingCurrency(true);
    setCurrencyError(null);
    try {
      await putJSON<SettingsResponse>("/api/settings/general", { defaultCurrency: nextCurrency });
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update currency.";
      setCurrencyError(message);
    } finally {
      setSavingCurrency(false);
    }
  };

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
        <div className="card-body space-y-4">
          <h2 className="font-semibold">Currency</h2>
          <p className="text-sm opacity-70">Select the currency used to display amounts.</p>
          <label className="form-control w-full max-w-xs">
            <span className="label-text">Default currency</span>
            <select
              className="select select-bordered"
              value={currency}
              onChange={(event) => void handleCurrencyChange(event.target.value)}
              disabled={savingCurrency}
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          {currencyError ? <p className="text-sm text-error">{currencyError}</p> : null}
          {savingCurrency ? <p className="text-sm opacity-70">Saving…</p> : null}
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
