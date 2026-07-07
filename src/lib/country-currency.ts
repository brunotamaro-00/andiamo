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

/**
 * Inverse of {@link flagFromCountryCode}: turns a regional-indicator flag emoji
 * (e.g. "🇮🇹") back into its lowercase ISO 3166-1 alpha-2 code (e.g. "it").
 *
 * Returns null for anything that isn't exactly two regional indicators — plain
 * emoji like 🌍 or 🎒 (used by the "general"/"recursos" pseudo-guides) fall
 * through so callers can render them verbatim. Windows lacks flag glyphs in its
 * system fonts, so callers use the code to render an SVG flag instead.
 */
export function countryCodeFromFlag(flag: string | null | undefined): string | null {
  if (!flag) return null;
  const cps = Array.from(flag, (ch) => ch.codePointAt(0)!);
  if (cps.length !== 2) return null;
  const [a, b] = cps;
  const A = 0x1f1e6; // 🇦
  const Z = 0x1f1ff; // 🇿
  if (a < A || a > Z || b < A || b > Z) return null;
  return (
    String.fromCharCode(97 + (a - A)) + String.fromCharCode(97 + (b - A))
  );
}
