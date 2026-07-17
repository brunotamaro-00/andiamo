import { Check } from "lucide-react";

/** Shared POI done-circle — one visual for TodayPoiList and PoiPanel.
 *  Pure visual span: the 44px touch target is the wrapping button.
 *  Pass `hover` when the wrapper exposes a `group` class for hover feedback. */
export function PoiCheck({ done, hover = false }: { done: boolean; hover?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "w-[22px] h-[22px] shrink-0 rounded-full border-2 flex items-center justify-center transition-colors duration-150",
        done
          ? "bg-success border-success text-surface"
          : `border-border-strong ${hover ? "group-hover:border-brick" : ""}`,
      ].join(" ")}
    >
      {done && <Check size={12} strokeWidth={3} />}
    </span>
  );
}
