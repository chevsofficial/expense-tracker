import { cookies } from "next/headers";
import type { Locale } from "./messages";

export function getLocale(): Locale {
  const c = cookies().get("locale")?.value;
  return c === "es" ? "es" : "en";
}
