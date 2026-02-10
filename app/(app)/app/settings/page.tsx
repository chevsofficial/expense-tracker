import { getLocale } from "@/src/i18n/getLocale";
import { SettingsGeneralClient } from "@/components/settings/SettingsGeneralClient";
import { requireAuthContext } from "@/src/server/api";

export default async function SettingsGeneralPage() {
  const auth = await requireAuthContext();
  const defaultCurrency = "response" in auth ? "MXN" : auth.workspace.defaultCurrency;
  const locale = await getLocale();
  return <SettingsGeneralClient locale={locale} defaultCurrency={defaultCurrency} />;
}
