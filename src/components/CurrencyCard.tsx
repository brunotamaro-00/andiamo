"use client";

import { useEffect, useState } from "react";
import { getCurrencySymbol, CURRENCY_NAMES } from "@/lib/currency-map";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

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
  const [error, setError] = useState(false);
  const [usdInput, setUsdInput] = useState("100");
  const [localInput, setLocalInput] = useState("100");

  useEffect(() => {
    let active = true;
    fetch("/api/rates")
      .then((r) => {
        if (!r.ok) throw new Error("rates error");
        return r.json();
      })
      .then((json) => {
        if (!active) return;
        if (!json?.rates) throw new Error("no rates");
        setData(json);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error && !data) {
    return (
      <Card>
        <SectionHeader title="Moneda" />
        <p className="text-ink-3 text-sm">Sin conexión</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <SectionHeader title="Moneda" />
        <div className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-20 opacity-60" />
        </div>
      </Card>
    );
  }

  const rate = data?.rates[currencyCode];
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

  const offlineAction = data?.source === "cached" ? (
    <span className="text-[11px] text-warning/70">(sin conexión)</span>
  ) : undefined;

  return (
    <Card>
      <SectionHeader title="Moneda" action={offlineAction} />

      {/* Currency info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-surface-2 rounded-[4px] px-3 py-2 flex-1 border border-border">
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
            <p className="text-xs text-ink-faint">{data?.date ?? ""}</p>
          </div>
        )}
      </div>

      {/* Converter */}
      {rate && (
        <div className="bg-surface-2/50 rounded-[4px] p-3 border border-border/50 space-y-3">
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
