import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe } from "lucide-react";
import { getTripDoc, getTripDocs, readDocMarkdown } from "@/lib/guides";
import { GuideMarkdown } from "@/components/guides/GuideMarkdown";
import { PageHeader } from "@/components/PageHeader";
import { cardClass } from "@/components/ui/Card";

/** Trip-wide docs ("El viaje": Eurail, presupuesto, packing list). They read
 *  here rather than under /guias because they belong with the trip-wide notes
 *  and documents, not with a country's guide. Static like the guide docs —
 *  the edge proxy is what gates them. In the demo `getTripDocs()` is empty, so
 *  there are no params and every URL 404s (`dynamicParams = false`). */
export const dynamicParams = false;

export function generateStaticParams() {
  return getTripDocs().map((doc) => ({ doc: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc: docSlug } = await params;
  const found = getTripDoc(docSlug);
  return { title: found ? `${found.doc.title} · General · Andiamo` : "General · Andiamo" };
}

/** Drops the first h1 when it repeats the page header (titles come from it). */
function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+[^\n]+\n/, "");
}

export default async function TripDocPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc: docSlug } = await params;
  const found = getTripDoc(docSlug);
  if (!found) notFound();

  const markdown = stripLeadingH1(await readDocMarkdown(found.doc.file));

  return (
    <div className="min-h-full bg-canvas">
      <PageHeader subtitle={found.doc.title} />

      <main className="px-4 py-5 max-w-lg mx-auto pb-24">
        <Link
          href="/general"
          className="inline-flex items-center gap-1 mb-2 min-h-[44px] label-caps text-ink-3 hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded-lg px-1 -ml-1"
        >
          <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
          <span className="truncate max-w-[16rem]">General</span>
        </Link>

        <article className={`${cardClass} px-4 py-5 animate-fade-in`}>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-border">
            <Globe size={22} strokeWidth={1.5} className="text-brick shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="label-caps text-ink-3">El viaje</p>
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
