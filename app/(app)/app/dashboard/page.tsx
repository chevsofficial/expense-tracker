import { getLocale } from "@/src/i18n/getLocale";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const locale = await getLocale();
  return (
    <main className="p-6">
      <DashboardClient locale={locale} />
    </main>
  );
}
