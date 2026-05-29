"use client";

import { useEffect, useState } from "react";
import { getCurrencySymbol, CURRENCY_NAMES } from "@/lib/currency-map";
import { Card, SectionHeader } from "@/components/ui/Card";

const NO_SPACE_SYMBOLS = new Set(["$", "€", "£", "₺"]);

function fmtNum(value: number, decimals: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmt(symbol: string, amount: string): string {
  return NO_SPACE_SYMBOLS.has(symbol) ? `${symbol}${amount}` : `${symbol} ${amount}`;
}

interface RatesData {
  rates: Record<string, number>;
  source: "live" | "cached";
  date?: string;
}

export function CurrencyCard({ currencyCode }: { currencyCode: string }) {
  const [data, setData] = useState<RatesData | null>(null);
  const [usdInput, setUsdInput] = useState("100");
  const [localInput, setLocalInput] = useState("100");

  useEffect(() => {
    fetch("/api/rates")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const rate = data?.rates[currencyCode];
  const symbol = getCurrencySymbol(currencyCode);
  const currencyName = CURRENCY_NAMES[currencyCode] ?? currencyCode;

  const decimals = currencyCode === "HUF" ? 0 : 2;

  const localFromUsd =
    rate && usdInput
      ? fmtNum(parseFloat(usdInput) * rate, decimals)
      : null;

  const usdFromLocal =
    rate && localInput
      ? fmtNum(parseFloat(localInput) / rate, 2)
      : null;

  const offlineAction = data?.source === "cached" ? (
    <span className="text-[11px] text-warning/70">(sin conexión)</span>
  ) : undefined;

  return (
    <Card>
      <SectionHeader title="Moneda" action={offlineAction} />

      {/* Currency info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-sand-850 rounded-xl px-3 py-2 flex-1 border border-sand-800">
          <p className="text-base font-semibold text-sand-100">
            {symbol} {currencyCode}
          </p>
          <p className="text-xs text-sand-500">{currencyName}</p>
        </div>
        {rate && (
          <div className="text-right">
            <p className="text-sm font-medium text-sand-200">
              1 USD = {fmt(symbol, fmtNum(rate, decimals))}
            </p>
            <p className="text-xs text-sand-600">{data?.date ?? ""}</p>
          </div>
        )}
      </div>

      {/* Converter */}
      {rate && (
        <div className="bg-sand-850/50 rounded-xl p-3 border border-sand-800/50 space-y-3">
          <p className="text-xs font-medium text-sand-500 uppercase tracking-wider">
            Convertidor
          </p>

          {/* USD → local */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-sand-500 w-12 shrink-0">USD</span>
            <input
              type="number"
              value={usdInput}
              onChange={(e) => setUsdInput(e.target.value)}
              className="flex-1 bg-sand-900 border border-sand-700 rounded-xl px-3 py-1.5 text-sm text-sand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-850"
              min="0"
              step="any"
              aria-label="Monto en USD"
            />
            <span className="text-sm text-sand-300 shrink-0 min-w-[5rem] text-right">
              {localFromUsd != null ? fmt(symbol, localFromUsd) : "–"}
            </span>
          </div>

          {/* local → USD */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-sand-500 w-12 shrink-0">{currencyCode}</span>
            <input
              type="number"
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              className="flex-1 bg-sand-900 border border-sand-700 rounded-xl px-3 py-1.5 text-sm text-sand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-850"
              min="0"
              step="any"
              aria-label={`Monto en ${currencyCode}`}
            />
            <span className="text-sm text-sand-300 shrink-0 min-w-[5rem] text-right">
              {usdFromLocal != null ? fmt("$", usdFromLocal) : "–"}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
