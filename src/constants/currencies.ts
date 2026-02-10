export const SUPPORTED_CURRENCIES = ["USD", "MXN", "JPY", "GBP", "EUR", "CAD", "AUD"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
