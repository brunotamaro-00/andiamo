"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, AlertCircle } from "lucide-react";
import { springToast } from "@/lib/motion";

/* Hydration flag: false on the server snapshot, true on the client */
const subscribeNoop = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

const DURATION_MS = 2600;

type ToastKind = "success" | "error";

interface ToastData {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Fire-and-forget confirmation pill. Success feedback only — expected
 *  mutation errors keep using MutationErrorBanner (inline, persistent). */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // One toast at a time: a new one replaces the current instantly.
  const [current, setCurrent] = useState<ToastData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useSyncExternalStore(subscribeNoop, getTrue, getFalse);

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent({ id: Date.now(), kind, message });
    timer.current = setTimeout(() => setCurrent(null), DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            role="status"
            // Above the TabBar (h-16) + safe area; pointer-events none so it never blocks taps
            className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-[10000] flex justify-center pointer-events-none px-4"
          >
            <AnimatePresence>
              {current && (
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={springToast}
                  className={[
                    "flex items-center gap-2 max-w-sm rounded-full px-4 py-2.5 card-shadow-lg",
                    current.kind === "success"
                      ? "bg-ink text-canvas"
                      : "bg-danger text-surface",
                  ].join(" ")}
                >
                  {current.kind === "success" ? (
                    <Check size={14} strokeWidth={3} className="shrink-0 text-gold" aria-hidden="true" />
                  ) : (
                    <AlertCircle size={14} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
                  )}
                  <span className="text-sm font-semibold truncate">{current.message}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
