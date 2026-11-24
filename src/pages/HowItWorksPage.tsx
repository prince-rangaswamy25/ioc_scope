import React, { useState } from "react";
import { ArrowRight, CheckCircle2, Play, XCircle } from "lucide-react";
import { runExtractorTestSuite, TestCaseResult } from "../lib/extractor/tests";
import { IOC_TYPE_META, IOC_TYPE_ORDER } from "../lib/iocMeta";
import { IOCTypeBadge } from "../components/IOCBadge";

const PIPELINE_STAGES = [
  {
    step: "01",
    title: "Input Ingestion",
    detail: "Plain text, pasted SOC tickets, .eml, .pdf (pdf.js), and .docx (mammoth) parsed locally.",
  },
  {
    step: "02",
    title: "Defang Recognition",
    detail: "Detects hxxps, [.], (.), {.}, [dot], [at], and [://] while preserving original offsets.",
  },
  {
    step: "03",
    title: "Regex & Validators",
    detail: "Strict octet bounds (0–255), IANA TLD verification, hash entropy checks, and Base58/Bech32 wallet rules.",
  },
  {
    step: "04",
    title: "Overlap & Dedup",
    detail: "Priority-ordered span resolution prevents URLs from double-counting embedded domains/IPs.",
  },
  {
    step: "05",
    title: "Confidence & Risk",
    detail: "Surrounding prose keywords adjust indicator confidence; type diversity & severity compute 0–100 risk.",
  },
  {
    step: "06",
    title: "AI & Export",
    detail: "Optional grounded Gemini ATT&CK mapping plus STIX 2.1, JSON, CSV, and printable PDF reports.",
  },
];

export const HowItWorksPage: React.FC = () => {
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);

  const handleRunTests = () => {
    const res = runExtractorTestSuite();
    setTestResults(res);
  };

  const passedCount = testResults ? testResults.filter((r) => r.passed).length : 0;

  return (
    <div className="space-y-8">
      {/* Architecture Pipeline */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Extraction & Enrichment Architecture
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
          IOCScope separates deterministic local parsing from optional LLM contextual enrichment. Every indicator is validated structurally before entering the analyst table.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PIPELINE_STAGES.map((stage, idx) => (
            <div
              key={stage.step}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1020] p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                    Stage {stage.step}
                  </span>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden lg:block" aria-hidden="true" />
                  )}
                </div>
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mt-2">
                  {stage.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {stage.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pattern Specifications & Scoring Logic */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-4">
            Supported Pattern Specifications
          </h3>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {IOC_TYPE_ORDER.map((t) => {
              const meta = IOC_TYPE_META[t];
              return (
                <div key={t} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <IOCTypeBadge type={t} compact />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {meta.label}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {meta.description}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6">
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-3">
              Confidence Scoring Logic
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <li>
                <strong className="text-slate-900 dark:text-slate-200">Base Artifact Specificity:</strong>{" "}
                SHA-256/512 hashes, CVEs, and Registry keys start with high structural confidence (84–92%), while bare domains start at 55%.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-200">Defang Signal (+12%):</strong>{" "}
                Indicators intentionally defanged by analysts (<span className="font-mono">[.]</span>, <span className="font-mono">hxxp</span>) receive a strong malicious-intent boost.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-200">Context Window (±14–24%):</strong>{" "}
                Proximity to threat terms (<em>malware, dropper, C2, exploit</em>) raises confidence; proximity to <em>benign, allowlist, example</em> lowers it.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6">
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-3">
              Known Limitations
            </h3>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-4">
              <li>
                Bare filenames with TLDs that collide with file extensions (e.g., <span className="font-mono">.py</span>, <span className="font-mono">.sh</span>, <span className="font-mono">.zip</span>) are routed to File Paths rather than Domains.
              </li>
              <li>
                Scanned image-only PDFs without an embedded text layer require OCR prior to upload.
              </li>
              <li>
                Deterministic extraction does not query live threat reputation feeds automatically; use the Lookup page for external verification.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Interactive Unit Test Suite */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Extraction Engine Verification Suite
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Execute the bundled unit tests directly in your browser against the local extractor and validator modules.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunTests}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Run Extractor Unit Tests</span>
          </button>
        </div>

        {testResults && (
          <div className="space-y-3 mt-4">
            <div className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
              {passedCount} / {testResults.length} test assertions passed
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {testResults.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 bg-slate-50/70 dark:bg-[#0B1020] flex items-start gap-3"
                >
                  {t.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      <span className="font-mono text-slate-500 dark:text-slate-400 mr-2">
                        {t.id}
                      </span>
                      {t.name}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {t.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
