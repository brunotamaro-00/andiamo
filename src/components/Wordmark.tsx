interface WordmarkProps {
  /** "sm" for headers (24px logo), "lg" for login/hero (36px logo) */
  size?: "sm" | "lg";
}

export function Wordmark({ size = "sm" }: WordmarkProps) {
  const lg = size === "lg";
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <img
        src="/logo.svg"
        alt=""
        aria-hidden="true"
        className={lg ? "w-9 h-auto" : "w-6 h-auto"}
        draggable={false}
      />
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
