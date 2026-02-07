import { getLocale } from "@/src/i18n/getLocale";
import { t } from "@/src/i18n/t";

export default async function AccountsPage() {
  const locale = await getLocale();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(locale, "nav_accounts") ?? "Accounts"}</h1>
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body">
          <p className="opacity-70">Accounts management page (hook up existing UI here).</p>
        </div>
      </div>
    </div>
  );
}
