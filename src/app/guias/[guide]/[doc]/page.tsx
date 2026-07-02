import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAllGuides, getDoc, readDocMarkdown } from "@/lib/guides";
import { GuideMarkdown } from "@/components/guides/GuideMarkdown";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllGuides().flatMap((guide) =>
    [...guide.docs, ...guide.dayTrips].map((doc) => ({ guide: guide.slug, doc: doc.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ guide: string; doc: string }>;
}): Promise<Metadata> {
  const { guide: guideSlug, doc: docSlug } = await params;
  const found = getDoc(guideSlug, docSlug);
  return {
    title: found ? `${found.doc.title} · ${found.guide.title} · Andiamo` : "Guías · Andiamo",
  };
}

/** Drops the first h1 when it repeats the page header (titles come from it). */
function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+[^\n]+\n/, "");
}

export default async function GuideDocPage({
  params,
}: {
  params: Promise<{ guide: string; doc: string }>;
}) {
  const { guide: guideSlug, doc: docSlug } = await params;
  const found = getDoc(guideSlug, docSlug);
  if (!found) notFound();

  const markdown = stripLeadingH1(await readDocMarkdown(found.doc.file));

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-surface backdrop-blur border-b border-border-strong px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3">
        <Link
          href={`/guias/${found.guide.slug}`}
          className="text-ink-2 hover:text-ink text-sm transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick rounded-lg px-1 py-0.5"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          <span className="truncate max-w-24">{found.guide.title}</span>
        </Link>
        <h1 className="flex-1 text-sm font-medium text-ink-2 text-center truncate">
          {found.doc.title}
        </h1>
        <div className="w-20" />
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto pb-24">
        <article className="bg-surface rounded-[4px] border-2 border-border card-shadow px-4 py-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-border">
            <span className="text-2xl leading-none" aria-hidden="true">
              {found.guide.countryFlag}
            </span>
            <h2 className="font-display uppercase text-xl leading-tight text-ink tracking-wide">
              {found.doc.title}
            </h2>
          </div>
          <GuideMarkdown markdown={markdown} />
        </article>
      </main>
    </div>
  );
}
