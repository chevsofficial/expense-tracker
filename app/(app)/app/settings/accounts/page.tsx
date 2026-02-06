import { getLocale } from "@/src/i18n/getLocale";
import { AccountsClient } from "@/components/accounts/AccountsClient";

export default async function AccountsPage() {
  const locale = await getLocale();
  return (
    <main className="p-6 bg-base-100 text-base-content">
      <AccountsClient locale={locale} />
    </main>
  );
}
