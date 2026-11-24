import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  FileSearch,
  Loader2,
  Printer,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { fetchAIStatus, generateAIInsights } from "../services/ai/insightsService";
import { RiskLevelText } from "../components/IOCBadge";
import { SAMPLE_REPORTS } from "../data/samples";

export const InsightsPage: React.FC = () => {
  const {
    activeWorkspace,
    setWorkspaceText,
    runExtraction,
    setWorkspaceAIInsights,
    pushToast,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  useEffect(() => {
    fetchAIStatus()
      .then((s) => setApiConfigured(s.configured))
      .catch(() => setApiConfigured(false));
  }, []);

  const handleGenerate = async () => {
    if (!activeWorkspace.rawText.trim()) {
      pushToast({
        type: "info",
        title: "No active incident report",
        description: "Paste or load a report in the Analyzer first.",
      });
      return;
    }

    if (!activeWorkspace.options.enableAIEnrichment) {
      pushToast({
        type: "info",
        title: "AI enrichment is toggled off",
        description: "Enable 'AI enrichment' in the Analyzer or Settings to send text to Gemini.",
      });
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const currentResult =
        activeWorkspace.result ?? (await runExtraction(activeWorkspace.rawText));
      const insights = await generateAIInsights({
        reportText: activeWorkspace.rawText,
        reportTitle: activeWorkspace.title,
        extractedIOCs: currentResult?.iocs ?? [],
      });
      setWorkspaceAIInsights(insights);
      pushToast({
        type: "success",
        title: "Threat intelligence brief generated",
        description: `Mapped ${insights.mitreTechniques.length} MITRE ATT&CK techniques.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate AI insights.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadQuickSample = async () => {
    const sample = SAMPLE_REPORTS[0];
    setWorkspaceText(sample.text, {
      title: sample.title,
      sourceName: `${sample.id}.txt`,
    });
    await runExtraction(sample.text);
  };

  const handleCopyMarkdownReport = async () => {
    const ai = activeWorkspace.aiInsights;
    if (!ai) return;

    const lines = [
      `# IOCScope AI Threat Assessment: ${activeWorkspace.title}`,
      `Notice: AI-generated, verify before action (Model: ${ai.model})`,
      `Threat Type: ${ai.threatType} | Severity: ${ai.severityAssessment} | Stage: ${ai.probableAttackStage}`,
      "",
      "## Executive Summary",
      ai.executiveSummary,
      "",
      "## Verified Referenced Indicators",
      ...(ai.referencedIOCs.length ? ai.referencedIOCs.map((v) => `- ${v}`) : ["- None"]),
      "",
      "## MITRE ATT&CK Techniques",
      ...ai.mitreTechniques.map((t) => `- ${t.id} (${t.name} · ${t.tactic}): ${t.reason}`),
      "",
      "## Recommended Containment Steps",
      ...ai.containmentSteps.map(
        (s, i) => `${i + 1}. [${s.priority}] ${s.action} (Target: ${s.targetIndicator})`
      ),
      ...(ai.timeline.length > 0
        ? [
            "",
            "## Observed Timeline",
            ...ai.timeline.map((e) => `- ${e.timestamp}: ${e.event}`),
          ]
        : []),
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 1800);
      pushToast({ type: "success", title: "Copied formatted report to clipboard" });
    } catch {
      pushToast({ type: "error", title: "Failed to copy to clipboard" });
    }
  };

  const insights = activeWorkspace.aiInsights;

  if (!activeWorkspace.rawText.trim()) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-[#10182E] p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-violet-500/12 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          No active incident report selected
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
          Analyze a report first or load a sample incident below to generate MITRE ATT&CK technique mappings, attack-stage classification, and containment steps.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-semibold"
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>Go to Analyzer</span>
          </Link>
          <button
            type="button"
            onClick={handleLoadQuickSample}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span>Load Phishing Sample</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Control Bar */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="min-w-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Active Case · {activeWorkspace.result?.summary.uniqueCount ?? 0} extracted indicators
          </div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white truncate mt-0.5">
            {activeWorkspace.title}
          </h2>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              AI-generated, verify before action. Model is constrained to only cite IOCs present in your report.
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {insights && (
            <>
              <button
                type="button"
                onClick={handleCopyMarkdownReport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {copiedReport ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy Report</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PDF</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !activeWorkspace.options.enableAIEnrichment}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Threat Context...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{insights ? "Regenerate AI Insights" : "Generate AI Insights"}</span>
              </>
            )}
          </button>
        </div>
      </section>

      {apiConfigured === false && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200">
          Gemini API key is not currently configured in server secrets. Configure{" "}
          <span className="font-mono">GEMINI_API_KEY</span> in the Settings &gt; Secrets panel to run AI enrichment. Deterministic IOC extraction remains fully functional offline.
        </div>
      )}

      {!activeWorkspace.options.enableAIEnrichment && (
        <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 p-4 text-xs text-slate-700 dark:text-slate-300">
          AI enrichment is currently disabled in your workspace options. Re-enable "Enable AI enrichment" in the{" "}
          <Link to="/analyze" className="text-cyan-600 dark:text-cyan-400 underline">
            Analyzer
          </Link>{" "}
          to permit sending report text to Gemini.
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-700 dark:text-red-300"
        >
          <div className="font-semibold">AI Enrichment Error</div>
          <p className="mt-1">{errorMsg}</p>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6 space-y-4">
          <div className="h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-20 rounded bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-36 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
            <div className="h-36 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          </div>
        </div>
      )}

      {!loading && insights && (
        <div className="space-y-6">
          {/* Classification Strip */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 print-break-inside-avoid">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Likely Threat Type</div>
              <div className="font-display text-base font-bold text-slate-900 dark:text-white mt-1">
                {insights.threatType}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Probable Attack Stage</div>
              <div className="font-display text-base font-bold text-cyan-700 dark:text-cyan-400 mt-1">
                {insights.probableAttackStage}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">AI Severity Assessment</div>
              <div className="font-display text-base font-bold mt-1">
                <RiskLevelText level={insights.severityAssessment} />
              </div>
            </div>
          </section>

          {/* Executive Summary */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6 print-break-inside-avoid">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Executive Threat Summary
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                AI-generated, verify before action
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {insights.executiveSummary}
            </p>

            {insights.referencedIOCs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Verified Key Indicators Cited
                </div>
                <div className="flex flex-wrap gap-2">
                  {insights.referencedIOCs.map((val) => (
                    <code
                      key={val}
                      className="px-2 py-1 rounded-md bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-cyan-300 break-all"
                    >
                      {val}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* MITRE ATT&CK Techniques */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] overflow-hidden print-break-inside-avoid">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                MITRE ATT&CK Technique Mapping
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {insights.mitreTechniques.length} techniques
              </span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {insights.mitreTechniques.map((tech) => (
                <div key={tech.id} className="p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="sm:w-44 shrink-0">
                    <div className="font-mono text-sm font-semibold text-violet-700 dark:text-violet-400">
                      {tech.id}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {tech.tactic}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {tech.name}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {tech.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Containment Steps + Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6 print-break-inside-avoid">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-500" aria-hidden="true" />
                <span>Recommended Containment & Eradication</span>
              </h3>
              <ol className="space-y-3.5">
                {insights.containmentSteps.map((step, idx) => (
                  <li
                    key={idx}
                    className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1020]"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-cyan-700 dark:text-cyan-400">
                        {idx + 1}. {step.priority}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                        {step.targetIndicator}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
                      {step.action}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6 print-break-inside-avoid">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-500" aria-hidden="true" />
                <span>Extracted Event Timeline</span>
              </h3>
              {insights.timeline.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  No explicit timestamps or chronological dates were detected in the incident report text.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {insights.timeline.map((item, idx) => (
                    <div
                      key={idx}
                      className="pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0"
                    >
                      <div className="font-mono text-xs font-medium text-cyan-700 dark:text-cyan-400">
                        {item.timestamp}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {item.event}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
