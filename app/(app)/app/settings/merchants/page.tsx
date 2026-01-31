import { getLocale } from "@/src/i18n/getLocale";
import { MerchantsClient } from "./MerchantsClient";

export default async function MerchantsPage() {
  const locale = await getLocale();
  return <MerchantsClient locale={locale} />;
}
