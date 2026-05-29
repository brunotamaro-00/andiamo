"use client";

import { useEffect, useState } from "react";
import { getCurrencySymbol, CURRENCY_NAMES } from "@/lib/currency-map";

interface RatesData {
  rates: Record<string, number>;
  source: "live" | "cached";
  date?: string;
}

export function CurrencyCard({ currencyCode }: { currencyCode: string }) {
  const [data, setData] = useState<RatesData | null>(null);
  const [amount, setAmount] = useState("100");

  useEffect(() => {
    fetch("/api/rates")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const rate = data?.rates[currencyCode];
  const symbol = getCurrencySymbol(currencyCode);
  const currencyName = CURRENCY_NAMES[currencyCode] ?? currencyCode;

  // How many local units = 1 USD
  const localAmount = rate && amount ? (parseFloat(amount) * rate).toFixed(2) : null;
  // How many USD = 1 local unit
  const usdAmount = rate && amount ? (parseFloat(amount) / rate).toFixed(2) : null;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Moneda
        {data?.source === "cached" && (
          <span className="ml-2 text-amber-500/70">(sin conexión)</span>
        )}
      </h2>

      <div className="flex items-center gap-2 mb-4">
        <div className="bg-slate-800 rounded-xl px-3 py-2 flex-1">
          <p className="text-lg font-bold text-slate-100">{symbol} {currencyCode}</p>
          <p className="text-xs text-slate-400">{currencyName}</p>
        </div>
        {rate && (
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-200">
              1 USD = {symbol}{rate.toFixed(currencyCode === "HUF" ? 0 : currencyCode === "CZK" ? 1 : 2)}
            </p>
            <p className="text-xs text-slate-500">{data?.date ?? ""}</p>
          </div>
        )}
      </div>

      {/* Converter */}
      {rate && (
        <div className="bg-slate-800/50 rounded-xl p-3 space-y-2">
          <p className="text-xs text-slate-500 mb-2">Convertidor rápido</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 w-8">USD</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              min="0"
              step="any"
            />
            <span className="text-sm text-slate-400">→ {symbol}{localAmount ?? "–"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 w-8">{currencyCode}</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              min="0"
              step="any"
            />
            <span className="text-sm text-slate-400">→ ${usdAmount ?? "–"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
