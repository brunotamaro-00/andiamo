"use client";

import { motion } from "motion/react";
import { easeSmooth } from "@/lib/motion";

/* Page transition: template.tsx remounts on every navigation by design, so
 * each page enters with a subtle fade + rise. Chosen over Next's experimental
 * viewTransition because this integrates with MotionConfig reducedMotion and
 * is stable. Don't add `animate-fade-in` at page level — it would double up. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      // h-full le da altura definida al wrapper para que el `min-h-full` de cada
      // página resuelva: contra un padre de altura auto, ese 100% no computa y
      // una pantalla corta (/login) queda pegada arriba en vez de centrada. El
      // contenido más alto simplemente desborda — scroll-root es el que scrollea.
      className="h-full"
      // Tokens: y = --distance-base (8px), duration = --duration-fast (250ms).
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: easeSmooth }}
    >
      {children}
    </motion.div>
  );
}
