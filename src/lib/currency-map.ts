export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  EUR: "€",
  CHF: "Fr.",
  CZK: "Kč",
  PLN: "zł",
  HUF: "Ft",
  USD: "$",
  SEK: "kr",
  DKK: "kr",
  NOK: "kr",
  RON: "lei",
  BGN: "лв",
  ISK: "kr",
  TRY: "₺",
  RSD: "din",
};

export const CURRENCY_NAMES: Record<string, string> = {
  GBP: "Libra esterlina",
  EUR: "Euro",
  CHF: "Franco suizo",
  CZK: "Corona checa",
  PLN: "Esloti polaco",
  HUF: "Forinto húngaro",
  SEK: "Corona sueca",
  DKK: "Corona danesa",
  NOK: "Corona noruega",
  RON: "Leu rumano",
  BGN: "Lev búlgaro",
  ISK: "Corona islandesa",
  TRY: "Lira turca",
  RSD: "Dinar serbio",
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}
