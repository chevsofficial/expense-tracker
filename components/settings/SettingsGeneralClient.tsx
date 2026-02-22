"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/src/i18n/messages";
import { ThemeContext, type ThemePreference } from "@/src/theme/ThemeProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { CHIP_CLASS_NO_PADDING } from "@/components/ui/uiClasses";
import { delJSON, getJSON, patchJSON, putJSON } from "@/src/lib/apiClient";
import { SUPPORTED_CURRENCIES } from "@/src/constants/currencies";
import { getWorkspaceCurrency } from "@/src/lib/currency";
import { Modal } from "@/components/ui/Modal";
import { fieldBase, formGrid, labelBase } from "@/components/ui/formStyles";
import { SelectField } from "@/components/ui/SelectField";

type SettingsResponse = { data: { defaultCurrency: string } };
type SexValue = "" | "female" | "male" | "nonbinary" | "prefer_not_to_say";
type MeResponse = {
  data: {
    email: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    sex: SexValue;
    locale: Locale;
    themePreference: ThemePreference;
  };
};

export function SettingsGeneralClient({ defaultCurrency }: { defaultCurrency: string }) {
  const router = useRouter();
  const theme = useContext(ThemeContext);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState<SexValue>("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [initialProfileState, setInitialProfileState] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "" as SexValue,
  });
  const [email, setEmail] = useState("—");
  const [newEmail, setNewEmail] = useState("");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [language, setLanguage] = useState<Locale>("en");
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");

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
          setDateOfBirth(profileResponse.data.dateOfBirth ?? "");
          setSex(profileResponse.data.sex ?? "");
          setInitialProfileState({
            firstName: profileResponse.data.firstName ?? "",
            lastName: profileResponse.data.lastName ?? "",
            dateOfBirth: profileResponse.data.dateOfBirth ?? "",
            sex: profileResponse.data.sex ?? "",
          });
          setLanguage(profileResponse.data.locale ?? "en");
          setThemePreference(profileResponse.data.themePreference ?? "system");
          theme?.setPreference(profileResponse.data.themePreference ?? "system");
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
  }, [theme]);

  const isProfileDirty = useMemo(
    () =>
      firstName !== initialProfileState.firstName ||
      lastName !== initialProfileState.lastName ||
      dateOfBirth !== initialProfileState.dateOfBirth ||
      sex !== initialProfileState.sex,
    [dateOfBirth, firstName, initialProfileState, lastName, sex]
  );

  const handleProfileUpdate = async () => {
    setProfileSaving(true);
    setProfileError(null);
    try {
      const response = await patchJSON<MeResponse>("/api/me", {
        firstName,
        lastName,
        dateOfBirth,
        sex,
      });
      setInitialProfileState({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        dateOfBirth: response.data.dateOfBirth,
        sex: response.data.sex,
      });
      setToast("General information updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update profile.";
      setProfileError(message);
    } finally {
      setProfileSaving(false);
    }
  };

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

  const handleLanguageChange = async (nextLocale: Locale) => {
    setProfileError(null);
    setLanguage(nextLocale);
    try {
      await patchJSON<MeResponse>("/api/me", { locale: nextLocale });
      document.cookie = `locale=${nextLocale}; path=/; max-age=31536000`;
      router.refresh();
      setToast("Language updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update language.";
      setProfileError(message);
    }
  };

  const handleThemeChange = async (nextThemePreference: ThemePreference) => {
    setProfileError(null);
    setThemePreference(nextThemePreference);
    theme?.setPreference(nextThemePreference);
    try {
      await patchJSON<MeResponse>("/api/me", { themePreference: nextThemePreference });
      setToast("Theme updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update theme.";
      setProfileError(message);
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

          <div className="rounded-xl bg-base-200 p-4 shadow-sm border border-base-300 space-y-4">
            <p className="text-sm font-semibold">General Information</p>
            <div className={formGrid}>
              <label className="w-full">
                <span className={labelBase}>First name</span>
                <input className={fieldBase} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>

              <label className="w-full">
                <span className={labelBase}>Last name</span>
                <input className={fieldBase} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </label>

              <label className="w-full">
                <span className={labelBase}>Date of birth</span>
                <input
                  className={fieldBase}
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </label>

              <label className="w-full">
                <span className={labelBase}>Sex</span>
                <SelectField value={sex} onChange={(e) => setSex(e.target.value as SexValue)}>
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="nonbinary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </SelectField>
              </label>
            </div>
            <div className="flex justify-end">
              <button
                className="btn btn-primary btn-sm"
                type="button"
                onClick={() => void handleProfileUpdate()}
                disabled={profileSaving || !isProfileDirty}
              >
                Update
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-base-200 p-4 shadow-sm border border-base-300">
            <p className="text-sm font-semibold">Email</p>
            <p className="mt-1 text-sm opacity-80">{email}</p>
            <button className="btn btn-outline btn-sm mt-3" type="button" onClick={() => setEmailModalOpen(true)}>
              Update Email
            </button>
          </div>

          <div className="rounded-xl bg-base-200 p-4 shadow-sm border border-base-300 space-y-2">
            <p className="text-sm font-semibold">Language</p>
            <SelectField value={language} onChange={(e) => void handleLanguageChange(e.target.value as Locale)}>
              <option value="en">English</option>
              <option value="es">Español</option>
            </SelectField>
          </div>

          <div className="rounded-xl bg-base-200 p-4 shadow-sm border border-base-300 space-y-2">
            <p className="text-sm font-semibold">Currency</p>
            <SelectField
              value={currency}
              onChange={(event) => void handleCurrencyChange(event.target.value)}
              disabled={savingCurrency}
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </SelectField>
            {currencyError ? <p className="text-sm text-error">{currencyError}</p> : null}
            {savingCurrency ? <p className="text-sm opacity-70">Saving…</p> : null}
          </div>

          <div className="rounded-xl bg-base-200 p-4 shadow-sm border border-base-300 space-y-2">
            <p className="text-sm font-semibold">Theme</p>
            <SelectField
              value={themePreference}
              onChange={(event) => void handleThemeChange(event.target.value as ThemePreference)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </SelectField>
          </div>

          <div className="rounded-xl bg-base-200 p-4 shadow-sm border border-base-300">
            <p className="text-sm font-semibold text-error">Danger Zone</p>
            <p className="mt-1 text-sm opacity-70">Deleting your account removes your data permanently.</p>
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

      <Modal open={emailModalOpen} title="Update Email" onClose={() => setEmailModalOpen(false)}>
        <div className="space-y-4">
          <label className="w-full">
            <span className={labelBase}>New email</span>
            <input
              className={fieldBase}
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
