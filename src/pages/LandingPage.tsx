import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Download,
  FileSearch,
  Lock,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SAMPLE_REPORTS } from "../data/samples";
import { extractIOCs } from "../lib/extractor";
import { IOC_TYPE_META, IOC_TYPE_ORDER } from "../lib/iocMeta";
import { IOCTypeBadge, IOCTypeIcon } from "../components/IOCBadge";
import { useApp } from "../context/AppContext";

const HERO_IMAGE_SRC = "/src/assets/images/soc_threat_topology_1795494802488.jpg";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setWorkspaceText, runExtraction } = useApp();

  const [demoSampleIdx, setDemoSampleIdx] = useState(0);
  const [demoStep, setDemoStep] = useState(0);
  const [demoPlaying, setDemoPlaying] = useState(true);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const demoSample = SAMPLE_REPORTS[demoSampleIdx];
  const demoResult = useMemo(() => extractIOCs(demoSample.text), [demoSample.text]);

  // Animated progressive highlighting counter in live demo
  useEffect(() => {
    if (!demoPlaying) return;
    const total = demoResult.spans.length;
    if (total === 0) return;

    const timer = setInterval(() => {
      setDemoStep((prev) => (prev >= total ? 1 : prev + 1));
    }, 320);

    return () => clearInterval(timer);
  }, [demoPlaying, demoResult.spans.length]);

  const demoSegments = useMemo(() => {
    const raw = demoSample.text;
    const activeSpans = demoResult.spans.slice(0, demoStep);
    const segs: Array<
      | { kind: "text"; text: string; key: string }
      | { kind: "match"; text: string; type: keyof typeof IOC_TYPE_META; key: string }
    > = [];
    let cursor = 0;
    activeSpans.forEach((sp, i) => {
      if (sp.start > cursor) {
        segs.push({ kind: "text", text: raw.slice(cursor, sp.start), key: `t_${i}` });
      }
      segs.push({
        kind: "match",
        text: sp.rawText,
        type: sp.type,
        key: `m_${i}`,
      });
      cursor = sp.end;
    });
    if (cursor < raw.length) {
      segs.push({ kind: "text", text: raw.slice(cursor), key: "t_end" });
    }
    return segs;
  }, [demoSample.text, demoResult.spans, demoStep]);

  const handleOpenDemoInAnalyzer = async () => {
    setWorkspaceText(demoSample.text, {
      title: demoSample.title,
      sourceName: `${demoSample.id}.txt`,
    });
    await runExtraction(demoSample.text);
    navigate("/analyze");
  };

  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative soc-grid-bg border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-7 flex flex-col justify-center"
            >
              <div className="text-xs font-medium text-cyan-700 dark:text-cyan-400 tracking-wide">
                Automated SOC Indicator Intelligence
              </div>
              <h1
                className="font-display font-bold tracking-tight text-slate-900 dark:text-white mt-3 text-balance"
                style={{ fontSize: "clamp(2.25rem, 4vw, 3.6rem)", lineHeight: 1.08 }}
              >
                From messy incident text to actionable threat intelligence in seconds.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mt-5 max-w-2xl leading-relaxed">
                IOCScope extracts, validates, and refangs indicators of compromise locally in your browser—turning raw phishing emails, SOC tickets, and PDF advisories into deduplicated tables, STIX 2.1 bundles, and MITRE ATT&CK insights.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  to="/analyze"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <span>Try the Analyzer</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <a
                  href="#live-demo"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#10182E] hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-100 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <span>View Demo</span>
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                  <span>Client-side deterministic extraction</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>Zero auto-fetching of extracted URLs</span>
                <span aria-hidden="true">·</span>
                <span>STIX 2.1 & MITRE ATT&CK ready</span>
              </div>
            </motion.div>

            {/* Right Architectural Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45 }}
              className="lg:col-span-5 flex"
            >
              <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#0B1020] overflow-hidden relative min-h-[280px] lg:min-h-[380px]">
                {!heroImgFailed ? (
                  <img
                    src={HERO_IMAGE_SRC}
                    alt="Cyber threat operations network topology visualization"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0E1832] via-[#0B1020] to-[#171236] p-8">
                    <ShieldCheck className="w-16 h-16 text-cyan-400/70" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020]/90 via-[#0B1020]/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-5 left-5 right-5 text-slate-100">
                  <div className="text-xs font-mono text-cyan-300">
                    Deterministic Regex + Validator Pipeline
                  </div>
                  <div className="text-sm font-medium mt-1 text-slate-200">
                    Automatic normalization for <span className="font-mono">hxxps://</span>,{" "}
                    <span className="font-mono">[.]</span>, <span className="font-mono">[dot]</span>, and{" "}
                    <span className="font-mono">[at]</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 4-column Stats Strip placed below hero split */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { value: "9", label: "Indicator Categories", detail: "IPs, Domains, URLs, Hashes, CVEs & more" },
              { value: "5", label: "Export Formats", detail: "STIX 2.1, JSON, CSV, Plain Text, PDF" },
              { value: "100%", label: "Local Extraction", detail: "No raw reports leave browser unless AI enabled" },
              { value: "<20 ms", label: "Typical Triage", detail: "Chunked async engine up to 1 MB inputs" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-[#10182E]/90 p-4"
              >
                <div className="font-display text-2xl font-bold font-mono tabular-nums text-cyan-700 dark:text-cyan-400">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                  {stat.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {stat.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Mini-Demo Section */}
      <section id="live-demo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Live Indicator Extraction Preview
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              Watch IOCScope parse defanged indicators, hashes, CVEs, and persistence keys directly from raw incident prose.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SAMPLE_REPORTS.slice(0, 3).map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setDemoSampleIdx(idx);
                  setDemoStep(1);
                  setDemoPlaying(true);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  demoSampleIdx === idx
                    ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                    : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {s.category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Animated Highlighted Document */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                {demoSample.title}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setDemoPlaying((p) => !p)}
                  aria-label={demoPlaying ? "Pause live highlight" : "Resume live highlight"}
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {demoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDemoStep(0);
                    setDemoPlaying(true);
                  }}
                  aria-label="Replay highlight sequence"
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-auto max-h-[370px]">
              <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-slate-700 dark:text-slate-300">
                {demoSegments.map((seg) =>
                  seg.kind === "text" ? (
                    <React.Fragment key={seg.key}>{seg.text}</React.Fragment>
                  ) : (
                    <span
                      key={seg.key}
                      className={`px-1 py-0.5 rounded ${IOC_TYPE_META[seg.type].highlightClass}`}
                    >
                      {seg.text}
                    </span>
                  )
                )}
              </pre>
            </div>
          </div>

          {/* Extracted Indicators Snapshot */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Normalized Output
              </span>
              <span className="text-xs font-mono tabular-nums text-cyan-700 dark:text-cyan-400">
                {demoResult.summary.uniqueCount} unique IOCs · Risk {demoResult.summary.riskScore}/100
              </span>
            </div>
            <div className="p-4 flex-1 overflow-auto max-h-[310px] space-y-2.5">
              {demoResult.iocs.slice(0, 8).map((ioc) => (
                <div
                  key={ioc.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-slate-900 dark:text-slate-100 truncate">
                      {ioc.value}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {ioc.confidence} confidence · {ioc.occurrences}x
                    </div>
                  </div>
                  <IOCTypeBadge type={ioc.type} compact />
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleOpenDemoInAnalyzer}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-cyan-500 hover:bg-slate-800 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors"
              >
                <span>Open Full Report in Analyzer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Pipeline Flow */}
      <section className="border-y border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0E1529] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            How IOCScope Works
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-2xl">
            Built around a deterministic client-side parsing pipeline paired with optional AI threat context.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: "01. Paste or Upload",
                desc: "Drop raw SOC tickets, .eml phishing payloads, .pdf advisories, or .docx incident logs up to 1 MB.",
                icon: FileSearch,
              },
              {
                num: "02. Extract & Refang",
                desc: "Strict regex passes validate IP bounds, TLDs, hash entropy, and normalize obfuscated markers like hxxps or [.].",
                icon: Cpu,
              },
              {
                num: "03. Enrich & Score",
                desc: "Context-aware confidence scoring ranks artifacts, while Gemini optionally maps MITRE ATT&CK techniques.",
                icon: Sparkles,
              },
              {
                num: "04. Export & Track",
                desc: "Download STIX 2.1 bundles, CSV/JSON feeds, or printable reports and track recurring IOCs over time.",
                icon: Download,
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#10182E] p-5"
                >
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/12 border border-cyan-500/25 flex items-center justify-center mb-4">
                    <Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    {step.num}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supported IOC Types Strip + Capabilities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Supported Indicator Types
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              Nine specialized extractors with false-positive filtering and STIX 2.1 pattern mapping.
            </p>
          </div>
          <Link
            to="/how-it-works"
            className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline whitespace-nowrap"
          >
            Read extraction methodology
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {IOC_TYPE_ORDER.map((type) => {
            const meta = IOC_TYPE_META[type];
            return (
              <div
                key={type}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4 flex items-start gap-3.5"
              >
                <div className={`p-2 rounded-lg shrink-0 ${meta.badgeClass}`}>
                  <IOCTypeIcon type={type} className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {meta.label}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {meta.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Final Call to Action */}
        <div className="mt-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>Ready in your browser · No account required</span>
            </div>
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-2">
              Start triaging your next incident report
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Launch the analyzer workspace, run the extractor test suite, or inspect single indicators.
            </p>
          </div>
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <span>Launch Analyzer</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
