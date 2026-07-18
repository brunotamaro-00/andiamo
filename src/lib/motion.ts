/**
 * Canonical motion primitives for motion/react.
 *
 * The app's spring vocabulary was previously duplicated as local `SPRING`
 * consts across TabBar, SegmentedControl, Modal and Toast. These are the same
 * values, centralized so every component references one source and new motion
 * stays on-vocabulary. The CSS-side scale (durations/easings) lives in
 * `globals.css` under `:root` — keep the two in sync when tuning.
 *
 * Reduced motion is handled globally by `<MotionConfig reducedMotion="user">`
 * (Providers.tsx); imperative animations still guard with `useReducedMotion()`.
 */
import type { Transition } from "motion/react";

/** Nav / segmented pill — snappy, low travel (TabBar, SegmentedControl). */
export const springNav: Transition = {
  type: "spring",
  stiffness: 480,
  damping: 36,
};

/** Sheet / modal panel — a touch softer for a larger surface (Modal). */
export const springSheet: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 38,
};

/** Toast — quick, tight settle (Toast). */
export const springToast: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 32,
};

/** Small overshoot for "landing" pops — a check filling, a badge appearing. */
export const springPop: Transition = {
  type: "spring",
  stiffness: 600,
  damping: 18,
};

/** The app's default entrance/exit easing — cubic-bezier(0.22, 1, 0.36, 1).
 *  Mirrors CSS `--ease-smooth-out`. Used by the page template and count-up. */
export const easeSmooth: [number, number, number, number] = [0.22, 1, 0.36, 1];
