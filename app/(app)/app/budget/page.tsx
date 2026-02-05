import { getLocale } from "@/src/i18n/getLocale";
import { requireAuthContext } from "@/src/server/api";
import { BudgetClient } from "./BudgetClient";

export default async function BudgetPage() {
  const locale = await getLocale();
  const auth = await requireAuthContext();
  const defaultCurrency = "response" in auth ? "MXN" : auth.workspace.defaultCurrency;

  return (
    <main className="p-6 bg-base-100 text-base-content">
      <BudgetClient locale={locale} defaultCurrency={defaultCurrency} />
    </main>
  );
}
