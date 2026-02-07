import { getLocale } from "@/src/i18n/getLocale";
import { requireAuthContext } from "@/src/server/api";
import { BudgetDetailClient } from "@/components/budgets/BudgetDetailClient";

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ budgetId: string }>;
}) {
  const locale = await getLocale();
  const auth = await requireAuthContext();
  const defaultCurrency = "response" in auth ? "MXN" : auth.workspace.defaultCurrency;
  const { budgetId } = await params;

  return (
    <main className="p-6 bg-base-100 text-base-content">
      <BudgetDetailClient locale={locale} defaultCurrency={defaultCurrency} budgetId={budgetId} />
    </main>
  );
}
