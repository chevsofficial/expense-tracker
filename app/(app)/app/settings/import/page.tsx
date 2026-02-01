import { getLocale } from "@/src/i18n/getLocale";
import { ImportClient } from "./ImportClient";

export default async function ImportPage() {
  const locale = await getLocale();
  return <ImportClient locale={locale} />;
}
