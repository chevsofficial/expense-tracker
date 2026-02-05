"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/src/i18n/messages";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();

  const setLocale = (next: Locale) => {
    document.cookie = `locale=${next}; path=/; max-age=31536000`;
    router.refresh();
  };

  return (
    <div className="join">
      <button
        className={`btn btn-sm join-item ${locale === "en" ? "btn-primary" : "btn-outline"}`}
        onClick={() => setLocale("en")}
        type="button"
      >
        EN
      </button>
      <button
        className={`btn btn-sm join-item ${locale === "es" ? "btn-primary" : "btn-outline"}`}
        onClick={() => setLocale("es")}
        type="button"
      >
        ES
      </button>
    </div>
  );
}
