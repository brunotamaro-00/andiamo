/**
 * Andiamo wordmark — map-pin SVG symbol + logotype.
 * Server component, no "use client" needed.
 */

interface WordmarkProps {
  /** "sm" for headers (24px pin), "lg" for login/hero (36px pin) */
  size?: "sm" | "lg";
}

export function Wordmark({ size = "sm" }: WordmarkProps) {
  const lg = size === "lg";
  return (
    <span className="inline-flex items-center gap-2 select-none">
      {/* Map-pin symbol: coral drop with off-white inner circle */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={lg ? "w-9 h-9" : "w-6 h-6"}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2C8.13 2 5 5.02 5 8.9c0 4.95 7 12.1 7 12.1s7-7.15 7-12.1C19 5.02 15.87 2 12 2Z"
          fill="#FF385C"
        />
        <circle cx="12" cy="9" r="2.6" fill="#FFF0F3" />
      </svg>

      {/* Logotype */}
      <span
        className={[
          "font-display font-bold tracking-tight text-ink",
          lg ? "text-3xl" : "text-lg",
        ].join(" ")}
      >
        Andiamo
      </span>
    </span>
  );
}
