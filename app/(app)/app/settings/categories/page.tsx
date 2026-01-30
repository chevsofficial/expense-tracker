import { AppTopNav } from "@/components/AppTopNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getLocale } from "@/src/i18n/getLocale";
import { t } from "@/src/i18n/t";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
  const locale = await getLocale();

  return (
    <>
      <AppTopNav
        appName={t(locale, "app_name")}
        rightSlot={<LanguageToggle locale={locale} />}
      />
      <main className="p-6">
        <CategoriesClient locale={locale} />
      </main>
    </>
  );
}
