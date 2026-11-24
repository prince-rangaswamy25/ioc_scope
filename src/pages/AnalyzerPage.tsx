import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  BookmarkCheck,
  Check,
  Copy,
  Download,
  ExternalLink,
  EyeOff,
  FileText,
  FileUp,
  Filter,
  Loader2,
  Printer,
  RotateCcw,
  ScanLine,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { SAMPLE_REPORTS } from "../data/samples";
import { parseIncidentFile } from "../lib/parsers/fileParser";
import { IOC_TYPE_META, IOC_TYPE_ORDER } from "../lib/iocMeta";
import { ConfidenceLevel, ExtractedIOC, IOCType } from "../types/ioc";
import {
  ConfidenceIndicator,
  IOCTypeBadge,
  RiskScoreGauge,
} from "../components/IOCBadge";
import { HighlightedReportView } from "../components/HighlightedReportView";
import {
  exportAsCSV,
  exportAsJSON,
  exportAsPlainText,
  exportAsSTIX21,
  triggerFileDownload,
} from "../lib/export";

type InputTab = "paste" | "upload" | "sample";
type ResultViewMode = "table" | "highlighted";
type SortField = "value" | "type" | "occurrences" | "confidence";

export const AnalyzerPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeWorkspace,
    setWorkspaceText,
    setWorkspaceTitle,
    updateWorkspaceOptions,
    isExtracting,
    runExtraction,
    clearWorkspace,
    toggleFalsePositive,
    saveCurrentToHistory,
    pushToast,
  } = useApp();

  const [inputTab, setInputTab] = useState<InputTab>("paste");
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [activeTypeTab, setActiveTypeTab] = useState<IOCType | "all">("all");
  const [viewMode, setViewMode] = useState<ResultViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel | "all">("all");
  const [showFalsePositives, setShowFalsePositives] = useState(true);
  const [sortField, setSortField] = useState<SortField>("confidence");
  const [sortAsc, setSortAsc] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const textStats = useMemo(() => {
    const t = activeWorkspace.rawText;
    const chars = t.length;
    const words = t.trim() ? t.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [activeWorkspace.rawText]);

  const handleExtractClick = async () => {
    const res = await runExtraction();
    if (res) {
      setActiveTypeTab("all");
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  };

  const handleFileUpload = async (file: File) => {
    setFileError(null);
    setIsParsingFile(true);
    try {
      const parsed = await parseIncidentFile(file);
      const baseTitle = file.name.replace(/\.[^.]+$/, "");
      setWorkspaceText(parsed.text, {
        title: baseTitle,
        sourceName: parsed.fileName,
      });
      setInputTab("paste");
      pushToast({
        type: "success",
        title: `Loaded ${parsed.fileName}`,
        description: `${parsed.fileType}${parsed.pageCount ? ` · ${parsed.pageCount} pages` : ""} · ${parsed.text.length.toLocaleString()} characters`,
      });
      await runExtraction(parsed.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse file.";
      setFileError(msg);
      pushToast({ type: "error", title: "File import failed", description: msg });
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleLoadSample = async (sampleId: string) => {
    const sample = SAMPLE_REPORTS.find((s) => s.id === sampleId);
    if (!sample) return;
    setWorkspaceText(sample.text, {
      title: sample.title,
      sourceName: `${sample.id}.txt`,
    });
    setInputTab("paste");
    await runExtraction(sample.text);
  };

  const handleCopyValue = async (val: string, id: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1500);
    } catch {
      pushToast({ type: "error", title: "Clipboard permission denied" });
    }
  };

  const handleCopyAll = async () => {
    if (!activeWorkspace.result) return;
    const active = activeWorkspace.result.iocs
      .filter((i) => !i.isFalsePositive)
      .map((i) => i.value);
    if (active.length === 0) return;
    try {
      await navigator.clipboard.writeText(active.join("\n"));
      pushToast({
        type: "success",
        title: "Copied indicators to clipboard",
        description: `${active.length} active IOCs copied.`,
      });
    } catch {
      pushToast({ type: "error", title: "Clipboard copy failed" });
    }
  };

  const handleExport = (format: "json" | "csv" | "stix" | "txt") => {
    if (!activeWorkspace.result) return;
    const slug = (activeWorkspace.title || "ioc-report")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (format === "json") {
      const content = exportAsJSON(activeWorkspace.result, {
        title: activeWorkspace.title,
        aiInsights: activeWorkspace.aiInsights,
      });
      triggerFileDownload(content, `${slug}.json`, "application/json");
    } else if (format === "csv") {
      const content = exportAsCSV(activeWorkspace.result);
      triggerFileDownload(content, `${slug}.csv`, "text/csv;charset=utf-8");
    } else if (format === "stix") {
      const content = exportAsSTIX21(activeWorkspace.result, activeWorkspace.title);
      triggerFileDownload(content, `${slug}.stix21.json`, "application/stix+json");
    } else {
      const content = exportAsPlainText(activeWorkspace.result);
      triggerFileDownload(content, `${slug}.txt`, "text/plain;charset=utf-8");
    }

    pushToast({
      type: "success",
      title: `Exported ${format.toUpperCase()}`,
      description: `Downloaded ${slug}.${format === "stix" ? "stix21.json" : format}`,
    });
  };

  const filteredIOCs = useMemo(() => {
    if (!activeWorkspace.result) return [];
    const q = searchQuery.trim().toLowerCase();

    const list = activeWorkspace.result.iocs.filter((ioc) => {
      if (!showFalsePositives && ioc.isFalsePositive) return false;
      if (activeTypeTab !== "all" && ioc.type !== activeTypeTab) return false;
      if (confidenceFilter !== "all" && ioc.confidence !== confidenceFilter) return false;
      if (q) {
        const matchVal = ioc.value.toLowerCase().includes(q);
        const matchCtx = ioc.contextSnippet.toLowerCase().includes(q);
        const matchSub = (ioc.subtype ?? "").toLowerCase().includes(q);
        if (!matchVal && !matchCtx && !matchSub) return false;
      }
      return true;
    });

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "value") cmp = a.value.localeCompare(b.value);
      else if (sortField === "type") cmp = a.type.localeCompare(b.type);
      else if (sortField === "occurrences") cmp = a.occurrences - b.occurrences;
      else cmp = a.confidenceScore - b.confidenceScore;
      return sortAsc ? cmp : -cmp;
    });

    return sorted;
  }, [
    activeWorkspace.result,
    activeTypeTab,
    confidenceFilter,
    searchQuery,
    showFalsePositives,
    sortAsc,
    sortField,
  ]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((v) => !v);
    } else {
      setSortField(field);
      setSortAsc(field === "value" || field === "type");
    }
  };

  const result = activeWorkspace.result;
  const falsePositiveCount = useMemo(
    () => (result ? result.iocs.filter((i) => i.isFalsePositive).length : 0),
    [result]
  );

  return (
    <div className="space-y-6">
      {/* Input Workspace Card */}
      <section
        aria-label="Incident report input"
        className="rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#10182E] p-5 sm:p-6 no-print"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex-1 min-w-0">
            <label htmlFor="report-title-input" className="sr-only">
              Incident Report Title
            </label>
            <input
              id="report-title-input"
              type="text"
              value={activeWorkspace.title}
              onChange={(e) => setWorkspaceTitle(e.target.value)}
              placeholder="Incident report title (e.g., SOC-2026-4108 Phishing Triage)"
              className="w-full bg-transparent text-lg font-display font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              <span>{textStats.chars.toLocaleString()} characters</span>
              <span aria-hidden="true">·</span>
              <span>{textStats.words.toLocaleString()} words</span>
              {activeWorkspace.sourceName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{activeWorkspace.sourceName}</span>
                </>
              )}
            </div>
          </div>

          {/* Input Mode Segmented Tabs */}
          <div
            role="tablist"
            aria-label="Input source"
            className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 self-start"
          >
            {(
              [
                { id: "paste", label: "Paste Text", icon: FileText },
                { id: "upload", label: "Upload File", icon: FileUp },
                { id: "sample", label: "Load Sample", icon: ShieldAlert },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = inputTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setInputTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    active
                      ? "bg-white dark:bg-[#182342] text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Bodies */}
        <div className="mt-4">
          {inputTab === "paste" && (
            <div>
              <label htmlFor="incident-textarea" className="sr-only">
                Incident report text
              </label>
              <textarea
                id="incident-textarea"
                rows={9}
                value={activeWorkspace.rawText}
                onChange={(e) => setWorkspaceText(e.target.value)}
                placeholder="Paste raw SOC ticket, phishing email headers/body, malware sandbox report, or threat advisory text (defanged indicators like hxxps://evil[.]com or 185[.]220[.]101[.]42 are automatically normalized)..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1020] p-4 font-mono text-[13px] leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-y"
              />
            </div>
          )}

          {inputTab === "upload" && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) handleFileUpload(dropped);
              }}
              className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                isDragging
                  ? "border-cyan-500 bg-cyan-500/5"
                  : "border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-[#0B1020]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.log,.md,.csv,.json,.eml,.pdf,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                  e.target.value = "";
                }}
              />
              {isParsingFile ? (
                <div className="flex flex-col items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Loader2 className="w-7 h-7 animate-spin text-cyan-500" />
                  <p className="text-sm font-medium">Parsing document locally...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
                    <FileUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Drag and drop an incident report, or browse files
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Supports .txt, .log, .eml, .csv, .pdf, and .docx (parsed 100% locally in your browser)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                  >
                    Select File
                  </button>
                  {fileError && (
                    <p className="text-xs text-red-500 mt-1" role="alert">
                      {fileError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {inputTab === "sample" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SAMPLE_REPORTS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleLoadSample(sample.id)}
                  className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1020] hover:border-cyan-500/50 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-cyan-700 dark:text-cyan-400">
                      {sample.category}
                    </span>
                    <span
                      className={
                        sample.severity === "Critical"
                          ? "text-red-600 dark:text-red-400 font-semibold"
                          : "text-amber-600 dark:text-amber-400 font-semibold"
                      }
                    >
                      {sample.severity}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                    {sample.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {sample.summary}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Options & Primary Action Bar */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={activeWorkspace.options.refangDefanged}
                onChange={(e) =>
                  updateWorkspaceOptions({ refangDefanged: e.target.checked })
                }
                className="rounded border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-cyan-400"
              />
              <span>Refang defanged IOCs</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={activeWorkspace.options.filterPrivateIPs}
                onChange={(e) =>
                  updateWorkspaceOptions({ filterPrivateIPs: e.target.checked })
                }
                className="rounded border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-cyan-400"
              />
              <span>Filter private/reserved IPs</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={activeWorkspace.options.filterBenignDomains}
                onChange={(e) =>
                  updateWorkspaceOptions({ filterBenignDomains: e.target.checked })
                }
                className="rounded border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-cyan-400"
              />
              <span>Filter benign domains</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={activeWorkspace.options.enableAIEnrichment}
                onChange={(e) =>
                  updateWorkspaceOptions({ enableAIEnrichment: e.target.checked })
                }
                className="rounded border-slate-300 dark:border-slate-700 text-violet-500 focus:ring-violet-400"
              />
              <span>Enable AI enrichment</span>
            </label>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={clearWorkspace}
              disabled={!activeWorkspace.rawText && !result}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear</span>
            </button>

            <button
              type="button"
              onClick={handleExtractClick}
              disabled={isExtracting || !activeWorkspace.rawText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-sm font-semibold disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Scanning Report...</span>
                </>
              ) : (
                <>
                  <ScanLine className="w-4 h-4" aria-hidden="true" />
                  <span>Extract IOCs</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
          Privacy notice: Deterministic IOC extraction and file parsing execute locally inside your browser. Report text is only transmitted to the Gemini API when you explicitly run AI Insights. Extracted URLs are never fetched or opened automatically.
        </p>
      </section>

      {/* Scanning Line & Skeleton State */}
      {isExtracting && (
        <section
          aria-label="Extraction in progress"
          className="relative overflow-hidden rounded-xl border border-cyan-500/40 bg-white dark:bg-[#10182E] p-6"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-cyan-400/20 via-cyan-400/5 to-transparent border-t-2 border-cyan-400 animate-scan-line"
          />
          <div className="flex items-center gap-3 text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-5">
            <ScanLine className="w-4 h-4 animate-spin" />
            <span>Running deterministic regex passes, defang normalization, and confidence scoring...</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[0, 1, 2, 3].map((k) => (
              <div
                key={k}
                className="h-20 rounded-lg bg-slate-100 dark:bg-slate-800/70 animate-pulse"
              />
            ))}
          </div>
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4].map((r) => (
              <div
                key={r}
                className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800/50 animate-pulse"
              />
            ))}
          </div>
        </section>
      )}

      {/* Results Workspace */}
      {!isExtracting && result && (
        <div ref={resultsRef} className="space-y-6">
          {/* Print Header (only visible when printing PDF report) */}
          <div className="hidden print-only border-b border-slate-300 pb-4 mb-4">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              IOCScope Threat Intelligence Report
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{activeWorkspace.title}</h1>
            <div className="text-xs text-slate-600 mt-1">
              Generated: {new Date().toLocaleString()} · Unique IOCs: {result.summary.uniqueCount} · Risk Score: {result.summary.riskScore}/100 ({result.summary.riskLevel})
            </div>
          </div>

          {/* Summary KPI Strip */}
          <section
            aria-label="Extraction summary"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4 flex items-center justify-between">
              <RiskScoreGauge
                score={result.summary.riskScore}
                level={result.summary.riskLevel}
              />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4 flex flex-col justify-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Unique Active IOCs
              </span>
              <div className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {result.summary.uniqueCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                {falsePositiveCount} marked false positive
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4 flex flex-col justify-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Total Occurrences
              </span>
              <div className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {result.summary.totalOccurrences}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                {result.filteredOutCount} filtered benign/private
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4 flex flex-col justify-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Engine Latency
              </span>
              <div className="text-2xl font-display font-bold font-mono tabular-nums text-cyan-700 dark:text-cyan-400 mt-1">
                {result.summary.processingTimeMs} ms
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                {IOC_TYPE_ORDER.filter((t) => result.summary.byType[t] > 0).length} indicator categories
              </div>
            </div>
          </section>

          {/* Action & Export Bar */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4 flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                Export:
              </span>
              <button
                type="button"
                onClick={() => handleExport("json")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>JSON</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport("csv")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport("stix")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>STIX 2.1</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport("txt")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Plain Text</span>
              </button>
              <button
                type="button"
                onClick={handleCopyAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy All</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Print PDF</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => saveCurrentToHistory()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>
                  {activeWorkspace.activeHistoryId ? "Update History" : "Save to History"}
                </span>
              </button>

              {activeWorkspace.options.enableAIEnrichment && (
                <button
                  type="button"
                  onClick={() => navigate("/insights")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>AI Insights</span>
                </button>
              )}
            </div>
          </section>

          {/* Type Tabs & Filters */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] overflow-hidden">
            {/* IOC Type Filter Tabs */}
            <div className="px-4 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-print">
              <button
                type="button"
                onClick={() => setActiveTypeTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTypeTab === "all"
                    ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                All <span className="font-mono tabular-nums ml-1">{result.iocs.length}</span>
              </button>

              {IOC_TYPE_ORDER.map((type) => {
                const count = result.iocs.filter((i) => i.type === type).length;
                const meta = IOC_TYPE_META[type];
                const active = activeTypeTab === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveTypeTab(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                        : count === 0
                          ? "text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {meta.pluralLabel}{" "}
                    <span className="font-mono tabular-nums ml-1">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Search, Confidence Filter, and View Mode Switch */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 no-print">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative flex-1 min-w-[210px] max-w-sm">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter IOCs or context..."
                    aria-label="Filter extracted IOCs"
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1020] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <select
                    aria-label="Confidence filter"
                    value={confidenceFilter}
                    onChange={(e) =>
                      setConfidenceFilter(e.target.value as ConfidenceLevel | "all")
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1020] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <option value="all">All Confidence</option>
                    <option value="High">High Confidence</option>
                    <option value="Medium">Medium Confidence</option>
                    <option value="Low">Low Confidence</option>
                  </select>
                </div>

                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFalsePositives}
                    onChange={(e) => setShowFalsePositives(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-cyan-500"
                  />
                  <span>Show marked false positives</span>
                </label>
              </div>

              <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 self-start">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    viewMode === "table"
                      ? "bg-white dark:bg-[#182342] text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  IOC Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("highlighted")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    viewMode === "highlighted"
                      ? "bg-white dark:bg-[#182342] text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Highlighted Report
                </button>
              </div>
            </div>

            {viewMode === "highlighted" ? (
              <div className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Hover or focus any highlighted indicator to inspect its normalized value and confidence. Click an indicator to open its lookup view.
                </div>
                <HighlightedReportView
                  rawText={activeWorkspace.rawText}
                  spans={result.spans}
                  iocs={result.iocs}
                  onSelectIOC={(ioc: ExtractedIOC) =>
                    navigate(`/lookup?ioc=${encodeURIComponent(ioc.value)}`)
                  }
                />
              </div>
            ) : filteredIOCs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No indicators matched the current filters
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Try clearing your search query or switching to the "All" category tab.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-[#0D1428]">
                      <th className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSort("value")}
                          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                        >
                          <span>Indicator Value</span>
                          <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => toggleSort("type")}
                          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                        >
                          <span>Type</span>
                          <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleSort("occurrences")}
                          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                        >
                          <span>Count</span>
                          <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => toggleSort("confidence")}
                          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                        >
                          <span>Confidence</span>
                          <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </th>
                      <th className="py-2.5 px-3 hidden md:table-cell">Context Snippet</th>
                      <th className="py-2.5 px-4 text-right no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80 text-xs">
                    {filteredIOCs.map((ioc) => (
                      <tr
                        key={ioc.id}
                        className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/35 ${
                          ioc.isFalsePositive ? "opacity-50" : ""
                        }`}
                      >
                        <td className="py-3 px-4 max-w-[280px]">
                          <div
                            className={`font-mono text-[12.5px] break-all text-slate-900 dark:text-slate-100 ${
                              ioc.isFalsePositive ? "line-through" : ""
                            }`}
                          >
                            {ioc.value}
                          </div>
                          {ioc.isDefanged && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              Source: <span className="font-mono">{ioc.originalValues[0]}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <IOCTypeBadge type={ioc.type} subtype={ioc.subtype} />
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {ioc.occurrences}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <ConfidenceIndicator
                            level={ioc.confidence}
                            score={ioc.confidenceScore}
                          />
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell max-w-xs">
                          <p className="text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {ioc.contextSnippet}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap no-print">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopyValue(ioc.value, ioc.id)}
                              title="Copy normalized value"
                              aria-label={`Copy ${ioc.value}`}
                              className="p-1.5 rounded-md text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              {copiedId === ioc.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/lookup?ioc=${encodeURIComponent(ioc.value)}`)
                              }
                              title="External threat intel lookup"
                              aria-label={`Lookup ${ioc.value}`}
                              className="p-1.5 rounded-md text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleFalsePositive(ioc.id)}
                              title={
                                ioc.isFalsePositive
                                  ? "Restore indicator"
                                  : "Mark as false positive"
                              }
                              aria-label={
                                ioc.isFalsePositive
                                  ? `Restore ${ioc.value}`
                                  : `Mark ${ioc.value} as false positive`
                              }
                              className={`p-1.5 rounded-md transition-colors ${
                                ioc.isFalsePositive
                                  ? "text-amber-500 hover:bg-amber-500/10"
                                  : "text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              {ioc.isFalsePositive ? (
                                <RotateCcw className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Empty State when no extraction has been run yet */}
      {!isExtracting && !result && (
        <section className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#10182E]/50 p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center mx-auto mb-3">
            <ScanLine className="w-5 h-5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
          </div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Ready to extract threat indicators
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
            Paste unstructured SOC text above, drop a PDF/DOCX advisory, or pick one of the 4 built-in incident samples to test extraction, defang normalization, and STIX 2.1 export.
          </p>
          <button
            type="button"
            onClick={() => handleLoadSample("sample-phishing")}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            <span>Try Phishing Sample Report</span>
          </button>
        </section>
      )}
    </div>
  );
};
