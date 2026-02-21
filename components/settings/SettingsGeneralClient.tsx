"use client";

import { useContext, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/src/i18n/messages";
import { ThemeContext } from "@/src/theme/ThemeProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PageHeader } from "@/components/ui/PageHeader";
import { CHIP_CLASS_NO_PADDING } from "@/components/ui/uiClasses";
import { delJSON, getJSON, putJSON } from "@/src/lib/apiClient";
import { SUPPORTED_CURRENCIES } from "@/src/constants/currencies";
import { getWorkspaceCurrency } from "@/src/lib/currency";
import { Modal } from "@/components/ui/Modal";
import { INPUT_BASE_CLASS, SELECT_BASE_CLASS } from "@/components/ui/inputStyles";

type SettingsResponse = { data: { defaultCurrency: string } };
type MeResponse = {
  data: {
    email: string;
    firstName: string;
    lastName: string;
    dob: string;
    sex: "" | "female" | "male" | "other" | "prefer_not_to_say";
  };
};

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
  const [sex, setSex] = useState<"" | "female" | "male" | "other" | "prefer_not_to_say">("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("—");
  const [newEmail, setNewEmail] = useState("");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [currency, setCurrency] = useState(() => getWorkspaceCurrency({ defaultCurrency }));
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [currencyError, setCurrencyError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const [settingsResponse, profileResponse] = await Promise.all([
          getJSON<SettingsResponse>("/api/settings/general"),
          getJSON<MeResponse>("/api/me"),
        ]);
        if (isMounted) {
          setCurrency(getWorkspaceCurrency({ defaultCurrency: settingsResponse.data.defaultCurrency }));
          setEmail(profileResponse.data.email);
          setNewEmail(profileResponse.data.email);
          setFirstName(profileResponse.data.firstName ?? "");
          setLastName(profileResponse.data.lastName ?? "");
          setDob(profileResponse.data.dob ?? "");
          setSex(profileResponse.data.sex ?? "");
        }
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : "Unable to load settings.";
          setCurrencyError(message);
          setProfileError(message);
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

  const handleUpdateEmail = async () => {
    setProfileSaving(true);
    setProfileError(null);
    try {
      const response = await putJSON<MeResponse>("/api/me/email", { email: newEmail });
      setEmail(response.data.email);
      setNewEmail(response.data.email);
      setEmailModalOpen(false);
      setToast("Email updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update email.";
      setProfileError(message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt("Type DELETE to confirm account deletion.");
    if (confirmation !== "DELETE") return;

    setProfileSaving(true);
    setProfileError(null);
    try {
      await delJSON<{ data: { success: boolean } }>("/api/me");
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete account.";
      setProfileError(message);
      setProfileSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="General" />

      {toast ? (
        <div className="alert alert-success">
          <span>{toast}</span>
        </div>
      ) : null}
      {profileError ? (
        <div className="alert alert-error">
          <span>{profileError}</span>
        </div>
      ) : null}

      <div className={CHIP_CLASS_NO_PADDING}>
        <div className="card-body space-y-4">
          <h2 className="font-semibold">Account Settings</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="w-full">
              <span className="mb-1 block text-sm font-medium text-neutral-700">First name</span>
              <input
                className={INPUT_BASE_CLASS}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>

            <label className="w-full">
              <span className="mb-1 block text-sm font-medium text-neutral-700">Last name</span>
              <input
                className={INPUT_BASE_CLASS}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>

            <label className="w-full">
              <span className="mb-1 block text-sm font-medium text-neutral-700">Date of birth</span>
              <input
                className={INPUT_BASE_CLASS}
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </label>

            <label className="w-full">
              <span className="mb-1 block text-sm font-medium text-neutral-700">Sex</span>
              <select
                className={SELECT_BASE_CLASS}
                value={sex}
                onChange={(e) =>
                  setSex(e.target.value as "" | "female" | "male" | "other" | "prefer_not_to_say")
                }
              >
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </label>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm border border-neutral-300">
            <p className="text-sm font-semibold">Email</p>
            <p className="mt-1 text-sm opacity-80">{email}</p>
            <button className="btn btn-outline btn-sm mt-3" type="button" onClick={() => setEmailModalOpen(true)}>
              Update Email
            </button>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm border border-neutral-300">
            <p className="text-sm font-semibold text-error">Danger Zone</p>
            <p className="mt-1 text-sm opacity-70">
              Deleting your account removes your data permanently.
            </p>
            <button
              className="btn btn-outline btn-sm text-error mt-3"
              type="button"
              onClick={() => void handleDeleteAccount()}
              disabled={profileSaving}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      <div className={CHIP_CLASS_NO_PADDING}>
        <div className="card-body">
          <h2 className="font-semibold">Language</h2>
          <p className="opacity-70 text-sm">Choose your preferred language.</p>

          <LanguageToggle locale={locale} />
        </div>
      </div>

      <div className={CHIP_CLASS_NO_PADDING}>
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

      <div className={CHIP_CLASS_NO_PADDING}>
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

      <Modal open={emailModalOpen} title="Update Email" onClose={() => setEmailModalOpen(false)}>
        <div className="space-y-4">
          <label className="w-full">
            <span className="mb-1 block text-sm font-medium text-neutral-700">New email</span>
            <input
              className={INPUT_BASE_CLASS}
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setEmailModalOpen(false)} type="button">
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => void handleUpdateEmail()}
              type="button"
              disabled={profileSaving}
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
