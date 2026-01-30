import { cookies } from "next/headers";
import type { Locale } from "./messages";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const c = cookieStore.get("locale")?.value;
  return c === "es" ? "es" : "en";
}
