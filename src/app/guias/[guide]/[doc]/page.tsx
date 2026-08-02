import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAllGuides, getDoc, guideDocs, readDocMarkdown } from "@/lib/guides";
import { demoDocMarkdown } from "@/lib/guides-demo";
import { IS_DEMO } from "@/lib/demo";
import { GuideMarkdown } from "@/components/guides/GuideMarkdown";
import { PageHeader } from "@/components/PageHeader";
import { Flag } from "@/components/Flag";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllGuides().flatMap((guide) =>
    guideDocs(guide).map((doc) => ({ guide: guide.slug, doc: doc.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ guide: string; doc: string }>;
}): Promise<Metadata> {
  const { guide: guideSlug, doc: docSlug } = await params;
  const found = getDoc(guideSlug, docSlug);
  if (!found) return { title: "Guías · Andiamo" };
  const scope = found.city ? `${found.city.title} · ${found.guide.title}` : found.guide.title;
  return { title: `${found.doc.title} · ${scope} · Andiamo` };
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

  // The demo shows the file's structure, never the real research (guides-demo.ts)
  const markdown = IS_DEMO
    ? demoDocMarkdown({
        docSlug: found.doc.slug,
        cityPrefix: found.city?.slug,
        place: found.city?.title ?? found.guide.title,
        isDayTrip: found.isDayTrip,
      })
    : stripLeadingH1(await readDocMarkdown(found.doc.file));

  return (
    <div className="min-h-full bg-canvas">
      <PageHeader subtitle={found.doc.title} />

      <main className="px-4 py-5 max-w-lg mx-auto pb-24">
        <Link
          href={`/guias/${found.guide.slug}`}
          className="inline-flex items-center gap-1 mb-2 min-h-[44px] label-caps text-ink-3 hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded-lg px-1 -ml-1"
        >
          <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
          <span className="truncate max-w-[16rem]">
            {found.city ? `${found.guide.title} · ${found.city.title}` : found.guide.title}
          </span>
        </Link>

        <article className="bg-surface rounded-xl border border-border card-shadow px-4 py-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-border">
            <Flag flag={found.guide.countryFlag} className="text-2xl leading-none" />
            <div className="min-w-0">
              {found.city && (
                <p className="label-caps text-ink-3">
                  {found.city.title}
                </p>
              )}
              <h2 className="font-display uppercase text-xl leading-tight text-ink tracking-wide">
                {found.doc.title}
              </h2>
            </div>
          </div>
          <GuideMarkdown markdown={markdown} />
        </article>
      </main>
    </div>
  );
}
