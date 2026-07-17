"use client";

import { MotionConfig } from "motion/react";
import { ToastProvider } from "@/components/ui/Toast";

/** Client-side app providers. Mounted once in the root layout wrapping
 *  {children} — pages stay Server Components (children arrive as a prop). */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>{children}</ToastProvider>
    </MotionConfig>
  );
}
