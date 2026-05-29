export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  EUR: "€",
  CHF: "Fr.",
  CZK: "Kč",
  PLN: "zł",
  HUF: "Ft",
  USD: "$",
};

export const CURRENCY_NAMES: Record<string, string> = {
  GBP: "Libra esterlina",
  EUR: "Euro",
  CHF: "Franco suizo",
  CZK: "Corona checa",
  PLN: "Esloti polaco",
  HUF: "Forinto húngaro",
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}
