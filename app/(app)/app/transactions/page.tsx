import { getLocale } from "@/src/i18n/getLocale";
import { requireAuthContext } from "@/src/server/api";
import { TransactionsClient } from "./TransactionsClient";

export default async function TransactionsPage() {
  const locale = await getLocale();
  const auth = await requireAuthContext();
  const defaultCurrency = "response" in auth ? "MXN" : auth.workspace.defaultCurrency;

  return (
    <main className="p-6">
      <TransactionsClient locale={locale} defaultCurrency={defaultCurrency} />
    </main>
  );
}
