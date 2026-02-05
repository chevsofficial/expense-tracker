import { getLocale } from "@/src/i18n/getLocale";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
  const locale = await getLocale();

  return (
    <main className="p-6 bg-base-100 text-base-content">
      <CategoriesClient locale={locale} />
    </main>
  );
}
