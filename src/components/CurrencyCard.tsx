"use client";

import { useState } from "react";
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

interface CurrencyCardProps {
  currencyCode: string;
  rate: number | null;
  date?: string;
  source: "live" | "cached";
}

/** Client island: receives the rate from the server, keeps the converter interactive. */
export function CurrencyCard({ currencyCode, rate, date, source }: CurrencyCardProps) {
  const [usdInput, setUsdInput] = useState("100");
  const [localInput, setLocalInput] = useState("100");

  const symbol = getCurrencySymbol(currencyCode);
  const currencyName = CURRENCY_NAMES[currencyCode] ?? currencyCode;

  const decimals = currencyCode === "HUF" ? 0 : 2;

  const localFromUsd =
    rate && Number.isFinite(parseFloat(usdInput))
      ? fmtNum(parseFloat(usdInput) * rate, decimals)
      : null;

  const usdFromLocal =
    rate && Number.isFinite(parseFloat(localInput))
      ? fmtNum(parseFloat(localInput) / rate, 2)
      : null;

  const offlineAction = source === "cached" ? (
    <span className="text-[11px] text-warning/70">(sin conexión)</span>
  ) : undefined;

  return (
    <Card>
      <SectionHeader title="Moneda" action={offlineAction} />

      {/* Currency info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-surface-2 rounded-lg px-3 py-2 flex-1 border border-border">
          <p className="text-base font-semibold text-ink">
            {symbol} {currencyCode}
          </p>
          <p className="text-xs text-ink-3">{currencyName}</p>
        </div>
        {rate && (
          <div className="text-right">
            <p className="text-sm font-medium text-ink">
              1 USD = {fmt(symbol, fmtNum(rate, decimals))}
            </p>
            <p className="text-xs text-ink-faint">{date ?? ""}</p>
          </div>
        )}
      </div>

      {/* Converter */}
      {rate && (
        <div className="bg-surface-2/50 rounded-lg p-3 border border-border/50 space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
            Convertidor
          </p>

          {/* USD → local */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-3 w-12 shrink-0">USD</span>
            <input
              type="number"
              value={usdInput}
              onChange={(e) => setUsdInput(e.target.value)}
              className="flex-1 min-w-0 bg-surface border border-border-strong rounded-xl px-3 py-1.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brick focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2"
              min="0"
              step="any"
              aria-label="Monto en USD"
            />
            <span className="text-sm text-ink-2 shrink-0 min-w-[5rem] text-right">
              {localFromUsd != null ? fmt(symbol, localFromUsd) : "–"}
            </span>
          </div>

          {/* local → USD */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-3 w-12 shrink-0">{currencyCode}</span>
            <input
              type="number"
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              className="flex-1 min-w-0 bg-surface border border-border-strong rounded-xl px-3 py-1.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brick focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2"
              min="0"
              step="any"
              aria-label={`Monto en ${currencyCode}`}
            />
            <span className="text-sm text-ink-2 shrink-0 min-w-[5rem] text-right">
              {usdFromLocal != null ? fmt("$", usdFromLocal) : "–"}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
