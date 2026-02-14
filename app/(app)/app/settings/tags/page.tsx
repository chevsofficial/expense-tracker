import { getLocale } from "@/src/i18n/getLocale";
import { TagsClient } from "./TagsClient";

export default async function TagsPage() {
  const locale = await getLocale();
  return (
    <main className="p-6 bg-base-100 text-base-content">
      <TagsClient locale={locale} />
    </main>
  );
}
