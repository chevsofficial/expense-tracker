import { getLocale } from "@/src/i18n/getLocale";
import { ImportClient } from "./ImportClient";

export default async function ImportPage() {
  const locale = await getLocale();
  return (
    <main className="p-6 bg-base-100 text-base-content">
      <ImportClient locale={locale} />
    </main>
  );
}
