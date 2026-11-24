import React, { useMemo, useState } from "react";
import { ExtractedIOC, IOCMatchSpan } from "../types/ioc";
import { IOC_TYPE_META } from "../lib/iocMeta";

interface HighlightedReportViewProps {
  rawText: string;
  spans: IOCMatchSpan[];
  iocs: ExtractedIOC[];
  onSelectIOC?: (ioc: ExtractedIOC) => void;
}

/**
 * Renders original report text using pure React text nodes (XSS-safe, never innerHTML)
 * with inline color-coded highlights and hover/focus tooltips for each extracted IOC.
 */
export const HighlightedReportView: React.FC<HighlightedReportViewProps> = ({
  rawText,
  spans,
  iocs,
  onSelectIOC,
}) => {
  const [hoveredSpanIdx, setHoveredSpanIdx] = useState<number | null>(null);

  const iocById = useMemo(() => {
    const map = new Map<string, ExtractedIOC>();
    for (const item of iocs) {
      map.set(item.id, item);
    }
    return map;
  }, [iocs]);

  const segments = useMemo(() => {
    if (!rawText) return [];
    // Cap inline span rendering cleanly for enormous >400k char dumps
    const activeSpans = spans.slice(0, 2500);
    const parts: Array<
      | { kind: "text"; text: string; key: string }
      | { kind: "match"; span: IOCMatchSpan; ioc?: ExtractedIOC; key: string; idx: number }
    > = [];

    let cursor = 0;
    activeSpans.forEach((sp, idx) => {
      if (sp.start > cursor) {
        parts.push({
          kind: "text",
          text: rawText.slice(cursor, sp.start),
          key: `txt_${cursor}_${sp.start}`,
        });
      }
      parts.push({
        kind: "match",
        span: sp,
        ioc: iocById.get(sp.iocId),
        key: `ioc_${sp.start}_${sp.end}_${idx}`,
        idx,
      });
      cursor = Math.max(cursor, sp.end);
    });

    if (cursor < rawText.length) {
      parts.push({
        kind: "text",
        text: rawText.slice(cursor),
        key: `txt_tail_${cursor}`,
      });
    }

    return parts;
  }, [rawText, spans, iocById]);

  if (!rawText.trim()) {
    return (
      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        No report text to highlight.
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D1428] p-5 overflow-x-auto">
      <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">
        {segments.map((seg) => {
          if (seg.kind === "text") {
            return <React.Fragment key={seg.key}>{seg.text}</React.Fragment>;
          }

          const meta = IOC_TYPE_META[seg.span.type];
          const isFP = seg.ioc?.isFalsePositive;
          const isOpen = hoveredSpanIdx === seg.idx;

          return (
            <span
              key={seg.key}
              className="relative inline-block"
              onMouseEnter={() => setHoveredSpanIdx(seg.idx)}
              onMouseLeave={() => setHoveredSpanIdx(null)}
            >
              <button
                type="button"
                onClick={() => seg.ioc && onSelectIOC?.(seg.ioc)}
                onFocus={() => setHoveredSpanIdx(seg.idx)}
                onBlur={() => setHoveredSpanIdx(null)}
                className={`px-1 py-0.5 rounded text-left font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  isFP
                    ? "bg-slate-200/60 dark:bg-slate-800/60 text-slate-400 line-through"
                    : meta.highlightClass
                }`}
                aria-label={`${meta.label}: ${seg.span.normalizedValue}`}
              >
                {seg.span.rawText}
              </button>

              {isOpen && seg.ioc && (
                <span
                  role="tooltip"
                  className="absolute left-0 bottom-full mb-2 z-30 w-72 p-3 rounded-lg bg-slate-900 dark:bg-[#17203A] text-slate-100 border border-slate-700 shadow-xl text-xs font-sans pointer-events-none"
                >
                  <span className="flex items-center justify-between gap-2 font-medium text-cyan-300">
                    <span>{meta.label}</span>
                    <span className="tabular-nums text-slate-300">
                      {seg.ioc.confidence} ({seg.ioc.occurrences}x)
                    </span>
                  </span>
                  <span className="block font-mono text-[11px] text-white mt-1 break-all">
                    {seg.ioc.value}
                  </span>
                  {seg.ioc.isDefanged && (
                    <span className="block text-[11px] text-slate-400 mt-1">
                      Normalized from defanged form
                    </span>
                  )}
                </span>
              )}
            </span>
          );
        })}
      </pre>
    </div>
  );
};
