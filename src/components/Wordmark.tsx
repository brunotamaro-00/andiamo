interface WordmarkProps {
  /** "sm" for headers (24px logo), "lg" for login/hero (36px logo) */
  size?: "sm" | "lg";
}

export function Wordmark({ size = "sm" }: WordmarkProps) {
  const lg = size === "lg";
  return (
    <span className="inline-flex items-center gap-2 select-none">
      {/* Andiamo hand logo — inline SVG, no HTTP request needed */}
      <svg
        viewBox="330 230 360 520"
        aria-hidden="true"
        className={lg ? "w-9 h-auto" : "w-6 h-auto"}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          transform="translate(0,1024) scale(0.100000,-0.100000)"
          fill="#C44428"
          fillRule="evenodd"
        >
          <path d="M5415 7738 c-50 -58 -101 -153 -110 -208 -6 -34 -2 -41 67 -116 40 -44 134 -147 208 -229 74 -82 187 -206 250 -275 63 -70 211 -232 329 -361 l214 -235 213 -629 c118 -345 216 -631 219 -634 3 -2 4 263 3 590 l-3 594 -25 55 c-17 37 -74 111 -180 230 -85 96 -327 371 -539 610 -211 239 -428 486 -483 548 -55 61 -103 112 -108 112 -5 0 -29 -24 -55 -52z" />
          <path d="M5236 7268 c-92 -136 -99 -305 -17 -466 16 -32 103 -173 192 -313 89 -140 188 -294 219 -344 31 -49 74 -117 95 -150 l39 -60 43 -380 c23 -209 42 -383 43 -387 0 -5 -182 -8 -405 -8 -223 0 -405 1 -405 3 0 3 74 434 129 752 92 537 91 564 -18 750 -27 46 -58 106 -68 135 -23 66 -76 119 -167 165 -94 48 -127 50 -138 10 -5 -16 -49 -187 -98 -380 -49 -192 -110 -424 -134 -515 l-45 -165 -148 -143 c-81 -78 -208 -200 -281 -270 -273 -260 -440 -515 -542 -827 -91 -282 -100 -382 -100 -1192 l0 -643 784 0 784 0 7 47 c10 67 48 165 89 226 68 102 25 68 1101 859 477 351 486 359 521 405 53 69 77 146 77 238 0 76 -7 98 -118 420 -64 187 -181 530 -260 762 -79 232 -149 432 -156 444 -6 12 -82 99 -168 193 -86 94 -293 321 -459 504 -167 182 -313 343 -324 357 -27 34 -30 33 -72 -27z" />
        </g>
      </svg>

      <span
        className={[
          "font-display uppercase tracking-tight text-ink inline-block leading-none",
          lg ? "text-4xl" : "text-2xl",
        ].join(" ")}
      >
        Andiamo
      </span>
    </span>
  );
}
