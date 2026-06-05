type Pattern = number | number[];

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

function buzz(pattern: Pattern) {
  if (!canVibrate()) return;
  try { navigator.vibrate(pattern); } catch { /* no-op */ }
}

export const haptics = {
  tap:     () => buzz(10),
  success: () => buzz([12, 35, 18]),
  warning: () => buzz(28),
  error:   () => buzz([35, 40, 35]),
};
