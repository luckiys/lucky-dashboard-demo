"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { demoFetch } from "@/lib/demo/demoFetch";

interface Article {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

const CATEGORIES = ["tech", "business", "world"] as const;
type Category = typeof CATEGORIES[number];

function safeTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "";
  }
}

export default function NewsWidget() {
  const [category, setCategory] = useState<Category>("tech");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    demoFetch(`/api/news?category=${category}`)
      .then((r) => r.json())
      .then((d) => { setArticles(d.articles ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category]);

  return (
    <div className="flex flex-col h-full">
      <div className="widget-head">
        <p className="section-label">News</p>
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="text-xs px-2 py-1 rounded-lg capitalize transition-all"
              style={{
                background: category === cat ? "rgba(201,242,79,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${category === cat ? "rgba(201,242,79,0.4)" : "var(--border)"}`,
                color: category === cat ? "var(--accent-purple)" : "var(--text-secondary)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 widget-scroll flex-1">
        {loading
          ? [...Array(5)].map((_, i) => <div key={i} className="shimmer h-14 rounded-xl" />)
          : articles.length === 0
          ? <p className="text-xs text-center mt-4" style={{ color: "var(--text-secondary)" }}>No articles loaded</p>
          : articles.map((a, i) => (
              <a
                key={i}
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-xl transition-all group"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium leading-snug group-hover:text-lime-200 transition-colors line-clamp-2">
                    {a.title}
                  </p>
                  <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: "var(--accent-blue)" }}>↗</span>
                </div>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs font-semibold" style={{ color: "var(--accent-purple)" }}>{a.source}</span>
                  {a.pubDate && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{safeTimeAgo(a.pubDate)}</span>}
                </div>
              </a>
            ))}
      </div>
    </div>
  );
}
