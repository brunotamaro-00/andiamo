import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAllGuides, getDoc, readDocMarkdown } from "@/lib/guides";
import { GuideMarkdown } from "@/components/guides/GuideMarkdown";
import { PageHeader } from "@/components/PageHeader";

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
      <PageHeader subtitle={found.doc.title} />

      <main className="px-4 py-5 max-w-lg mx-auto pb-24">
        <Link
          href={`/guias/${found.guide.slug}`}
          className="inline-flex items-center gap-1 mb-4 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded-lg px-1 -ml-1 py-0.5"
        >
          <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
          <span className="truncate max-w-[16rem]">{found.guide.title}</span>
        </Link>

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
