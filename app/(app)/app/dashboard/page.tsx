import { getLocale } from "@/src/i18n/getLocale";
import { requireAuthContext } from "@/src/server/api";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const locale = await getLocale();
  const auth = await requireAuthContext();
  const defaultCurrency = "response" in auth ? "MXN" : auth.workspace.defaultCurrency;
  return (
    <main className="p-6 bg-base-100 text-base-content">
      <DashboardClient locale={locale} defaultCurrency={defaultCurrency} />
    </main>
  );
}
