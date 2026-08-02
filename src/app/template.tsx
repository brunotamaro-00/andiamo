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
      // Tokens: y = --distance-base (8px), duration = --duration-fast (250ms).
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: easeSmooth }}
    >
      {children}
    </motion.div>
  );
}
