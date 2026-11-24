import React, { useState } from "react";
import { Shield, User } from "lucide-react";

const TEAM_MEMBERS = [
  {
    name: "Dr. Marcus Lin",
    role: "Lead Security Architect",
    focus: "Deterministic regex engines, STIX 2.1 schema compliance, and overlap resolution.",
    avatar: "/src/assets/images/analyst_lead_portrait_1795494803103.jpg",
  },
  {
    name: "Elena Rostova",
    role: "Threat Intelligence Researcher",
    focus: "MITRE ATT&CK mapping taxonomy, defang patterns, and phishing/ransomware corpora.",
    avatar: "/src/assets/images/analyst_threat_portrait_1795494804249.jpg",
  },
  {
    name: "Kenji Takahashi",
    role: "Principal Systems Engineer",
    focus: "Client-side PDF/DOCX parsing, chunked Web performance, and SOC analyst UX.",
    avatar: "/src/assets/images/analyst_eng_portrait_1795494804460.jpg",
  },
];

export const AboutPage: React.FC = () => {
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-8">
      {/* Project Overview */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-medium text-cyan-700 dark:text-cyan-400">
          <Shield className="w-4 h-4" aria-hidden="true" />
          <span>Project Overview</span>
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-2">
          IOCScope: Automated Indicator Extraction from Incident Reports
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed max-w-3xl">
          Security Operations Centers triage hundreds of unstructured incident tickets, phishing advisories, and forensic notes daily. Manual indicator extraction is slow, prone to missed defanged artifacts, and creates inconsistent downstream blocklists. IOCScope bridges the gap between raw prose and structured threat intelligence in seconds.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Core Objectives
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
              <li>Zero-latency local extraction with zero external URL fetching</li>
              <li>Accurate normalization of defanged IPs, domains, URLs, and emails</li>
              <li>Standards-compliant STIX 2.1, JSON, and CSV exports</li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Technology Stack
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
              <li>React 19, TypeScript, Vite, Tailwind CSS</li>
              <li>pdf.js &amp; mammoth for browser-side document parsing</li>
              <li>Recharts analytics &amp; Gemini API server-side insights</li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Future Scope
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
              <li>Browser extension for one-click web advisory triage</li>
              <li>Direct SIEM/SOAR webhook connectors &amp; TAXII 2.1 feeds</li>
              <li>Multi-language OCR extraction for scanned PDF advisories</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section>
        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-4">
          Engineering &amp; Threat Research Team
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TEAM_MEMBERS.map((member) => (
            <article
              key={member.name}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-5 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  {!failedAvatars[member.name] ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedAvatars((prev) => ({ ...prev, [member.name]: true }))
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    {member.name}
                  </h4>
                  <div className="text-xs text-cyan-700 dark:text-cyan-400 mt-0.5">
                    {member.role}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {member.focus}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Acknowledgements */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Standards &amp; Acknowledgements
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          IOCScope aligns its indicator output schemas with OASIS STIX 2.1 Cyber Observable Expressions, MITRE ATT&amp;CK Enterprise Matrix nomenclature, and IANA Top-Level Domain registries. Document parsing is powered by Mozilla pdf.js and Mammoth.js.
        </p>
      </section>
    </div>
  );
};
