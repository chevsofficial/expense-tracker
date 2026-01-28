import { messages, type Locale } from "./messages";

export function t(locale: Locale, key: string) {
  return messages[locale][key] ?? key;
}
