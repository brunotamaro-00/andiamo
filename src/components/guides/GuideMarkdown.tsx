import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Check, HelpCircle } from "lucide-react";

/** Renders guide markdown with the Panini design system.
 *  Corpus quirks handled here:
 *  - URLs wrapped in backticks become tappable links.
 *  - `[?]` task state (non-GFM) renders as a "candidata" check in special. */
export function GuideMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-3 text-sm text-ink leading-relaxed break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brick-ink font-semibold underline decoration-brick-border underline-offset-2 break-all hover:text-brick transition-colors duration-150"
    >
      {children}
    </a>
  );
}

/** Shortens a bare URL for display: strips protocol/www and truncates. */
function prettyUrl(url: string): string {
  const clean = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  return clean.length > 40 ? `${clean.slice(0, 37)}…` : clean;
}

function TaskCheck({ state }: { state: "done" | "todo" | "maybe" }) {
  if (state === "done") {
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 mr-1.5 -mt-0.5 rounded-xs bg-success align-middle shrink-0">
        <Check size={11} strokeWidth={3} className="text-surface" aria-hidden="true" />
        <span className="sr-only">hecho</span>
      </span>
    );
  }
  if (state === "maybe") {
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 mr-1.5 -mt-0.5 rounded-xs bg-special align-middle shrink-0">
        <HelpCircle size={11} strokeWidth={3} className="text-surface" aria-hidden="true" />
        <span className="sr-only">quizás</span>
      </span>
    );
  }
  return (
    <span
      className="inline-block w-4 h-4 mr-1.5 -mt-0.5 rounded-xs border-2 border-border-strong align-middle shrink-0"
      aria-hidden="true"
    />
  );
}

/** Detects a leading "[?]" text marker (non-GFM) in a list item's children. */
function extractMaybeMarker(children: ReactNode): { isMaybe: boolean; children: ReactNode } {
  const array = Array.isArray(children) ? children : [children];
  const first = array[0];
  if (typeof first === "string" && /^\s*\[\?\]\s*/.test(first)) {
    return {
      isMaybe: true,
      children: [first.replace(/^\s*\[\?\]\s*/, ""), ...array.slice(1)],
    };
  }
  return { isMaybe: false, children };
}

const components: Components = {
  h1: ({ children }) => (
    <h2 className="font-display uppercase text-2xl tracking-wide text-ink !mt-0">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="font-display uppercase text-xl tracking-wide text-ink pt-4 border-t-2 border-border first:pt-0 first:border-t-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="label-caps text-ink-3 pt-2">
      {children}
    </h3>
  ),
  h4: ({ children }) => <h4 className="text-sm font-extrabold text-ink pt-1">{children}</h4>,
  p: ({ children }) => <p>{children}</p>,
  a: ({ href, children }) => <ExternalLink href={href ?? "#"}>{children}</ExternalLink>,
  strong: ({ children }) => <strong className="font-extrabold text-ink">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  hr: () => <hr className="border-t-2 border-border my-4" />,
  code: ({ children }) => {
    const text = typeof children === "string" ? children : "";
    if (/^https?:\/\/\S+$/.test(text.trim())) {
      const url = text.trim();
      return <ExternalLink href={url}>{prettyUrl(url)}</ExternalLink>;
    }
    return (
      // Relative to the surrounding prose, but never below the 11px floor:
      // inside the guide tables (text-xs) a bare 0.85em lands at 10.2px, and
      // those cells are exactly where the prices, platform numbers and station
      // codes live.
      <code className="bg-surface-2 rounded px-1 py-0.5 text-[max(11px,0.85em)] break-all">{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-surface-2 border border-border rounded-lg p-3 overflow-x-auto text-xs">
      {children}
    </pre>
  ),
  ul: ({ children }) => <ul className="space-y-2 pl-1">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-2 pl-5 list-decimal">{children}</ol>,
  li: ({ children, className }) => {
    // remark-gfm marks task items with this class; the checkbox itself is an
    // <input> child rendered by the `input` mapping below.
    if (className?.includes("task-list-item")) {
      return <li className="list-none">{children}</li>;
    }
    const { isMaybe, children: rest } = extractMaybeMarker(children);
    if (isMaybe) {
      return (
        <li className="list-none">
          <TaskCheck state="maybe" />
          {rest}
        </li>
      );
    }
    return <li className="ml-3 list-disc marker:text-ink-3">{children}</li>;
  },
  input: ({ type, checked }) =>
    type === "checkbox" ? <TaskCheck state={checked ? "done" : "todo"} /> : null,
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-gold bg-gold-bg/40 px-3 py-2 rounded-r-sm [&>p]:m-0">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-2">{children}</thead>,
  th: ({ children }) => (
    <th className="text-left px-2.5 py-2 label-caps text-ink-3 border-b-2 border-border whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2.5 py-2 border-b border-border align-top">{children}</td>
  ),
};
