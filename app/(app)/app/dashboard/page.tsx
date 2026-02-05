import { getLocale } from "@/src/i18n/getLocale";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const locale = await getLocale();
  return (
    <main className="p-6 bg-base-100 text-base-content">
      <DashboardClient locale={locale} />
    </main>
  );
}
