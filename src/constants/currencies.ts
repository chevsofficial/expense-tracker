export const SUPPORTED_CURRENCIES = ["MXN", "USD"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
