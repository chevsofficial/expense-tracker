import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/src/server/auth";
import { AppTopNav } from "@/components/AppTopNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getLocale } from "@/src/i18n/getLocale";
import { t } from "@/src/i18n/t";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const locale = await getLocale();

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <AppTopNav
        appName={t(locale, "app_name")}
        dashboardLabel={t(locale, "nav_dashboard")}
        categoriesLabel={t(locale, "nav_categories")}
        merchantsLabel={t(locale, "nav_merchants")}
        importLabel={t(locale, "nav_import")}
        transactionsLabel={t(locale, "nav_transactions")}
        budgetLabel={t(locale, "nav_budget")}
        recurringLabel={t(locale, "nav_recurring")}
        rightSlot={<LanguageToggle locale={locale} />}
      />
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </div>
  );
}
