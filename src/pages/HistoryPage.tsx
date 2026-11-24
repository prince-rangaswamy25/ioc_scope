import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Database,
  Download,
  Edit3,
  FolderOpen,
  GitCompare,
  History as HistoryIcon,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { RiskLevelText, IOCTypeBadge } from "../components/IOCBadge";
import { triggerFileDownload } from "../lib/export";

type SortOption = "newest" | "oldest" | "risk" | "count";

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    history,
    loadFromHistory,
    renameHistoryItem,
    deleteHistoryItem,
    seedSampleHistory,
    pushToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [showCompare, setShowCompare] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = history.filter((item) => {
      if (riskFilter !== "all" && item.result.summary.riskLevel !== riskFilter) {
        return false;
      }
      if (q) {
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchIOC = item.result.iocs.some((i) =>
          i.value.toLowerCase().includes(q)
        );
        if (!matchTitle && !matchIOC) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "risk") {
        return b.result.summary.riskScore - a.result.summary.riskScore;
      }
      if (sortBy === "count") {
        return b.result.summary.uniqueCount - a.result.summary.uniqueCount;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [history, riskFilter, searchQuery, sortBy]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkExportJSON = () => {
    const chosen =
      selectedIds.length > 0
        ? history.filter((h) => selectedIds.includes(h.id))
        : filtered;
    if (chosen.length === 0) return;

    const bundle = {
      tool: "IOCScope Bulk Case Export",
      exportedAt: new Date().toISOString(),
      caseCount: chosen.length,
      cases: chosen.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        summary: c.result.summary,
        indicators: c.result.iocs.filter((i) => !i.isFalsePositive),
        aiInsights: c.aiInsights ?? null,
      })),
    };

    triggerFileDownload(
      JSON.stringify(bundle, null, 2),
      `iocscope-bulk-export-${chosen.length}-cases.json`,
      "application/json"
    );
    pushToast({
      type: "success",
      title: `Exported ${chosen.length} case(s)`,
    });
  };

  const comparePair = useMemo(() => {
    if (selectedIds.length !== 2) return null;
    const a = history.find((h) => h.id === selectedIds[0]);
    const b = history.find((h) => h.id === selectedIds[1]);
    if (!a || !b) return null;

    const mapA = new Map(
      a.result.iocs.filter((i) => !i.isFalsePositive).map((i) => [`${i.type}::${i.value.toLowerCase()}`, i])
    );
    const mapB = new Map(
      b.result.iocs.filter((i) => !i.isFalsePositive).map((i) => [`${i.type}::${i.value.toLowerCase()}`, i])
    );

    const shared = Array.from(mapA.entries())
      .filter(([k]) => mapB.has(k))
      .map(([, v]) => v);
    const onlyA = Array.from(mapA.entries())
      .filter(([k]) => !mapB.has(k))
      .map(([, v]) => v);
    const onlyB = Array.from(mapB.entries())
      .filter(([k]) => !mapA.has(k))
      .map(([, v]) => v);

    return { a, b, shared, onlyA, onlyB };
  }, [history, selectedIds]);

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-[#10182E] p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center mx-auto mb-4">
          <HistoryIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          No saved incident reports yet
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
          Save analyses from the Analyzer to review past cases, compare shared infrastructure between incidents, or export bulk JSON intelligence feeds.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={seedSampleHistory}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-semibold"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Load 4 Sample Reports</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/analyze")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span>Open Analyzer</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search case title or IOC value..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1020] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          <select
            aria-label="Filter by risk level"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1020] text-xs text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Risk Levels</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            aria-label="Sort cases"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1020] text-xs text-slate-800 dark:text-slate-200"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="risk">Highest Risk</option>
            <option value="count">Most IOCs</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={selectedIds.length !== 2}
            onClick={() => setShowCompare(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare Selected ({selectedIds.length}/2)</span>
          </button>

          <button
            type="button"
            onClick={handleBulkExportJSON}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {selectedIds.length > 0
                ? `Export Selected (${selectedIds.length})`
                : "Bulk Export JSON"}
            </span>
          </button>
        </div>
      </section>

      {/* Side-by-Side Comparison Panel */}
      {showCompare && comparePair && (
        <section
          aria-label="Side-by-side report comparison"
          className="rounded-xl border border-violet-500/40 bg-white dark:bg-[#10182E] p-5 space-y-5"
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Side-by-Side Indicator Comparison
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {comparePair.shared.length} shared IOCs · {comparePair.onlyA.length} unique to Report A · {comparePair.onlyB.length} unique to Report B
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCompare(false)}
              aria-label="Close comparison"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shared IOCs */}
          <div>
            <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 mb-2">
              Shared Overlapping Indicators ({comparePair.shared.length})
            </div>
            {comparePair.shared.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No overlapping indicators found between these two reports.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {comparePair.shared.map((ioc) => (
                  <div
                    key={ioc.id}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-cyan-500/12 border border-cyan-500/30 text-xs font-mono text-cyan-800 dark:text-cyan-200"
                  >
                    <IOCTypeBadge type={ioc.type} compact />
                    <span>{ioc.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Report A", item: comparePair.a, uniqueList: comparePair.onlyA },
              { label: "Report B", item: comparePair.b, uniqueList: comparePair.onlyB },
            ].map((col) => (
              <div
                key={col.item.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1020] p-4"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400">{col.label}</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 truncate">
                  {col.item.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3 tabular-nums">
                  Unique to this report: {col.uniqueList.length}
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {col.uniqueList.map((ioc) => (
                    <div
                      key={ioc.id}
                      className="flex items-center justify-between gap-2 text-xs py-1 border-b border-slate-200/60 dark:border-slate-800/60 last:border-0"
                    >
                      <span className="font-mono truncate text-slate-800 dark:text-slate-200">
                        {ioc.value}
                      </span>
                      <IOCTypeBadge type={ioc.type} compact />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cases List */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const isEditing = editingId === item.id;

          return (
            <article
              key={item.id}
              className={`rounded-xl border p-5 bg-white dark:bg-[#10182E] transition-colors flex flex-col justify-between gap-4 ${
                isSelected
                  ? "border-cyan-500 ring-1 ring-cyan-500/30"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <label className="inline-flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      aria-label={`Select ${item.title}`}
                      className="mt-1 rounded border-slate-300 dark:border-slate-700 text-cyan-500"
                    />
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                renameHistoryItem(item.id, editingTitle);
                                setEditingId(null);
                              }
                            }}
                            className="flex-1 px-2 py-1 rounded border border-cyan-500 bg-slate-50 dark:bg-[#0B1020] text-sm font-semibold text-slate-900 dark:text-white"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              renameHistoryItem(item.id, editingTitle);
                              setEditingId(null);
                            }}
                            aria-label="Save title"
                            className="p-1.5 rounded text-emerald-500 hover:bg-emerald-500/10"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                          {item.title}
                        </h3>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.result.summary.uniqueCount} unique IOCs</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Risk {item.result.summary.riskScore}/100 (
                          <RiskLevelText level={item.result.summary.riskLevel} />)
                        </span>
                      </div>
                    </div>
                  </label>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2 font-mono">
                  {item.rawText.slice(0, 180)}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    loadFromHistory(item.id);
                    navigate("/analyze");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Open Case</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingTitle(item.title);
                    }}
                    title="Rename case"
                    aria-label={`Rename ${item.title}`}
                    className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteHistoryItem(item.id)}
                    title="Delete case"
                    aria-label={`Delete ${item.title}`}
                    className="p-1.5 rounded-md text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};
