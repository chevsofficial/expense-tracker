import { getLocale } from "@/src/i18n/getLocale";
import { AccountsClient } from "@/components/accounts/AccountsClient";

export default async function AccountsPage() {
  const locale = await getLocale();
  return <AccountsClient locale={locale} />;
}
