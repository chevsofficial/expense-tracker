import { getLocale } from "@/src/i18n/getLocale";
import { SettingsGeneralClient } from "@/components/settings/SettingsGeneralClient";

export default async function SettingsGeneralPage() {
  const locale = await getLocale();
  return <SettingsGeneralClient locale={locale} />;
}
