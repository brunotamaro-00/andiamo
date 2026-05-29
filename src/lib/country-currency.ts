const COUNTRY_CURRENCY: Record<string, string> = {
  GB: "GBP",
  CH: "CHF",
  CZ: "CZK",
  PL: "PLN",
  HU: "HUF",
  SE: "SEK",
  DK: "DKK",
  NO: "NOK",
  RO: "RON",
  BG: "BGN",
  IS: "ISK",
  TR: "TRY",
  RS: "RSD",
  UA: "UAH",
  MK: "MKD",
  BA: "BAM",
  AL: "ALL",
  // EUR zone
  AT: "EUR", BE: "EUR", CY: "EUR", DE: "EUR", EE: "EUR", ES: "EUR", FI: "EUR",
  FR: "EUR", GR: "EUR", HR: "EUR", IE: "EUR", IT: "EUR", LT: "EUR", LU: "EUR",
  LV: "EUR", MT: "EUR", NL: "EUR", PT: "EUR", SI: "EUR", SK: "EUR",
  // Andorra/Monaco/San Marino/Vatican use EUR informally
  AD: "EUR", MC: "EUR", SM: "EUR", VA: "EUR",
};

export function currencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? "EUR";
}

export function flagFromCountryCode(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
