import { getLocale } from "@/src/i18n/getLocale";
import { MerchantsClient } from "./MerchantsClient";

export default async function MerchantsPage() {
  const locale = await getLocale();
  return (
    <main className="p-6 bg-base-100 text-base-content">
      <MerchantsClient locale={locale} />
    </main>
  );
}
