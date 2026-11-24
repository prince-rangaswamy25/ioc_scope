import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeftRight,
  Check,
  Copy,
  ExternalLink,
  SearchCode,
  Shield,
} from "lucide-react";
import { extractIOCs } from "../lib/extractor";
import { defangIndicator, refangText } from "../lib/defang";
import { IOCTypeBadge } from "../components/IOCBadge";
import { useApp } from "../context/AppContext";
import { IOCType } from "../types/ioc";

interface ExternalLookupLink {
  provider: string;
  description: string;
  url: string;
}

function getLookupLinks(value: string, type: IOCType, subtype?: string): ExternalLookupLink[] {
  const enc = encodeURIComponent(value);
  const links: ExternalLookupLink[] = [];

  if (type === "ip") {
    const cleanIp = value.split("/")[0];
    links.push(
      {
        provider: "VirusTotal",
        description: "Passive DNS, communicating files, and multi-engine detections",
        url: `https://www.virustotal.com/gui/ip-address/${encodeURIComponent(cleanIp)}`,
      },
      {
        provider: "AbuseIPDB",
        description: "Crowdsourced abuse confidence score and ISP/ASN metadata",
        url: `https://www.abuseipdb.com/check/${encodeURIComponent(cleanIp)}`,
      },
      {
        provider: "Shodan",
        description: "Open ports, service banners, TLS certificates, and host telemetry",
        url: `https://www.shodan.io/host/${encodeURIComponent(cleanIp)}`,
      },
      {
        provider: "URLScan.io",
        description: "Historical HTTP transactions and hosted infrastructure",
        url: `https://urlscan.io/ip/${encodeURIComponent(cleanIp)}`,
      }
    );
  } else if (type === "domain") {
    links.push(
      {
        provider: "VirusTotal",
        description: "DNS resolutions, WHOIS, and vendor threat classifications",
        url: `https://www.virustotal.com/gui/domain/${enc}`,
      },
      {
        provider: "URLScan.io",
        description: "Live DOM snapshots, redirects, and certificate chains",
        url: `https://urlscan.io/search/#domain:${enc}`,
      },
      {
        provider: "Shodan",
        description: "Associated server IPs and exposed services",
        url: `https://www.shodan.io/search?query=hostname:${enc}`,
      }
    );
  } else if (type === "url") {
    links.push(
      {
        provider: "VirusTotal",
        description: "URL scan verdicts and downloaded payload hashes",
        url: `https://www.virustotal.com/gui/search/${enc}`,
      },
      {
        provider: "URLScan.io",
        description: "Search existing sandbox renders without touching target URL",
        url: `https://urlscan.io/search/#page.url:${enc}`,
      }
    );
  } else if (type === "hash") {
    links.push(
      {
        provider: "VirusTotal",
        description: "AV engine detections, PE imports, and behavioral sandbox traces",
        url: `https://www.virustotal.com/gui/file/${enc}`,
      },
      {
        provider: "MalwareBazaar",
        description: "Sample metadata, YARA matches, and malware family tags",
        url: `https://bazaar.abuse.ch/browse.php?search=${enc}`,
      }
    );
  } else if (type === "cve") {
    links.push(
      {
        provider: "NIST NVD",
        description: "Official CVSS severity metrics, CPEs, and vendor advisories",
        url: `https://nvd.nist.gov/vuln/detail/${enc}`,
      },
      {
        provider: "MITRE CVE",
        description: "Canonical CVE record and reference disclosures",
        url: `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${enc}`,
      },
      {
        provider: "CISA KEV",
        description: "Search Known Exploited Vulnerabilities catalog",
        url: `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${enc}`,
      }
    );
  } else if (type === "email") {
    const domain = value.split("@")[1] ?? value;
    links.push(
      {
        provider: "VirusTotal (Domain)",
        description: "Reputation of the sender mail domain",
        url: `https://www.virustotal.com/gui/domain/${encodeURIComponent(domain)}`,
      },
      {
        provider: "AbuseIPDB / MXToolbox",
        description: "Inspect MX, SPF, and DMARC records for sender domain",
        url: `https://mxtoolbox.com/SuperTool.aspx?action=mx%3a${encodeURIComponent(domain)}`,
      }
    );
  } else if (type === "wallet") {
    if (subtype === "Ethereum") {
      links.push({
        provider: "Etherscan",
        description: "On-chain transaction history and token balances",
        url: `https://etherscan.io/address/${enc}`,
      });
    } else {
      links.push({
        provider: "Blockchain.com",
        description: "Bitcoin UTXO flow and transaction ledger",
        url: `https://www.blockchain.com/explorer/addresses/btc/${enc}`,
      });
    }
  } else {
    links.push({
      provider: "VirusTotal Search",
      description: "Query threat intelligence corpus for artifact string",
      url: `https://www.virustotal.com/gui/search/${enc}`,
    });
  }

  return links;
}

export const LookupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { pushToast } = useApp();

  const initialIOC = searchParams.get("ioc") ?? "hxxps://login-portal[.]okta-sso-verify[.]com/auth/v2/session";
  const [singleInput, setSingleInput] = useState(initialIOC);

  const [converterInput, setConverterInput] = useState(
    "https://cdn-assets.cloudsync-edge.net/update/agent.ps1\n185.220.101.42\nrecovery-desk@onionmail.org"
  );
  const [converterMode, setConverterMode] = useState<"defang" | "refang">("defang");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const param = searchParams.get("ioc");
    if (param) setSingleInput(param);
  }, [searchParams]);

  const detected = useMemo(() => {
    const trimmed = singleInput.trim();
    if (!trimmed) return null;
    const res = extractIOCs(trimmed, {
      refangDefanged: true,
      filterPrivateIPs: false,
      filterBenignDomains: false,
      enableAIEnrichment: false,
    });
    return res.iocs[0] ?? null;
  }, [singleInput]);

  const lookupLinks = useMemo(() => {
    if (!detected) return [];
    return getLookupLinks(detected.value, detected.type, detected.subtype);
  }, [detected]);

  const convertedOutput = useMemo(() => {
    if (!converterInput.trim()) return "";
    if (converterMode === "refang") {
      return refangText(converterInput);
    }
    return converterInput
      .split("\n")
      .map((line) => (line.trim() ? defangIndicator(line) : ""))
      .join("\n");
  }, [converterInput, converterMode]);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      pushToast({ type: "error", title: "Clipboard permission denied" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Single IOC Auto-Detect & External Threat Intel */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <SearchCode className="w-5 h-5 text-cyan-500" aria-hidden="true" />
              <span>Single Indicator Lookup</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Paste any raw or defanged indicator to auto-detect its type, normalize it, and open verified external OSINT lookups in a new tab.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <label htmlFor="single-ioc-input" className="sr-only">
            Indicator of Compromise
          </label>
          <input
            id="single-ioc-input"
            type="text"
            value={singleInput}
            onChange={(e) => setSingleInput(e.target.value)}
            placeholder="Paste IP, domain, URL, hash, CVE, email, registry key, or wallet..."
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1020] font-mono text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "IP", val: "185[.]220[.]101[.]42" },
              { label: "SHA-256", val: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" },
              { label: "CVE", val: "CVE-2024-3400" },
              { label: "BTC", val: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSingleInput(preset.val)}
                className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {detected ? (
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1020]">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Detected Type</div>
                <div className="mt-1.5">
                  <IOCTypeBadge type={detected.type} subtype={detected.subtype} />
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Normalized (Refanged)
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="font-mono text-xs text-slate-900 dark:text-cyan-300 break-all">
                    {detected.value}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(detected.value, "norm")}
                    aria-label="Copy normalized indicator"
                    className="p-1 rounded text-slate-400 hover:text-cyan-500 shrink-0"
                  >
                    {copiedKey === "norm" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Safe Report Form (Defanged)
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                    {defangIndicator(detected.value)}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(defangIndicator(detected.value), "defang")}
                    aria-label="Copy defanged indicator"
                    className="p-1 rounded text-slate-400 hover:text-cyan-500 shrink-0"
                  >
                    {copiedKey === "defang" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-cyan-500" aria-hidden="true" />
                <span>External OSINT Lookup Providers (opens in new tab)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lookupLinks.map((link) => (
                  <a
                    key={link.provider}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0B1020] hover:border-cyan-500/50 transition-colors flex items-start justify-between gap-3 group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                        {link.provider}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {link.description}
                      </p>
                    </div>
                    <ExternalLink
                      className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            Enter a valid IPv4/IPv6, CIDR, domain, URL, email, hash, CVE, file path, registry key, or crypto wallet above.
          </div>
        )}
      </section>

      {/* Bulk Defang / Refang Converter */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-violet-500" aria-hidden="true" />
              <span>Defang / Refang Batch Converter</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Safely neutralize live URLs/IPs/emails before sharing in emails or tickets, or restore defanged feeds back to canonical form.
            </p>
          </div>

          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 self-start">
            <button
              type="button"
              onClick={() => setConverterMode("defang")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                converterMode === "defang"
                  ? "bg-white dark:bg-[#182342] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Defang (Neutralize)
            </button>
            <button
              type="button"
              onClick={() => setConverterMode("refang")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                converterMode === "refang"
                  ? "bg-white dark:bg-[#182342] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Refang (Normalize)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="converter-source"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Input Indicators (one per line)
            </label>
            <textarea
              id="converter-source"
              rows={6}
              value={converterInput}
              onChange={(e) => setConverterInput(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1020] p-3.5 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="converter-output"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Converted Output
              </label>
              <button
                type="button"
                onClick={() => copyText(convertedOutput, "batch")}
                className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline"
              >
                {copiedKey === "batch" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Output</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              id="converter-output"
              rows={6}
              readOnly
              value={convertedOutput}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#0D1428] p-3.5 font-mono text-xs text-slate-800 dark:text-cyan-300 focus:outline-none"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
