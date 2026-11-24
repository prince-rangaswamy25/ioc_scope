import React, { useEffect, useState } from "react";
import { CheckCircle2, Moon, Plus, RotateCcw, Sun, Trash2, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { DEFAULT_BENIGN_DOMAINS } from "../lib/validators";
import { fetchAIStatus } from "../services/ai/insightsService";

export const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    settings,
    updateDefaultOptions,
    clearAllData,
    pushToast,
  } = useApp();

  const [newDomain, setNewDomain] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string } | null>(null);

  useEffect(() => {
    fetchAIStatus()
      .then(setAiStatus)
      .catch(() => setAiStatus({ configured: false, model: "gemini-4-hydrogen" }));
  }, []);

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!cleaned || !cleaned.includes(".")) {
      pushToast({
        type: "error",
        title: "Invalid domain format",
        description: "Enter a domain like example.com",
      });
      return;
    }
    if (settings.defaultOptions.benignDomainsAllowlist.includes(cleaned)) {
      setNewDomain("");
      return;
    }
    updateDefaultOptions({
      benignDomainsAllowlist: [cleaned, ...settings.defaultOptions.benignDomainsAllowlist],
    });
    setNewDomain("");
  };

  const handleRemoveDomain = (domain: string) => {
    updateDefaultOptions({
      benignDomainsAllowlist: settings.defaultOptions.benignDomainsAllowlist.filter(
        (d) => d !== domain
      ),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Theme Preference */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Interface Theme
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Switch between the deep Cyber SOC dark interface and high-contrast light mode.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 p-1 rounded-lg bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
              theme === "dark"
                ? "bg-[#182342] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dark Cyber SOC</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
              theme === "light"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Light Analyst</span>
          </button>
        </div>
      </section>

      {/* Default Extraction Options */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Default Extraction Options
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          These defaults apply whenever you start a fresh report analysis.
        </p>

        <div className="mt-4 space-y-3">
          {[
            {
              key: "refangDefanged" as const,
              label: "Automatically refang defanged indicators",
              desc: "Normalize hxxp, [.], [dot], and [at] into canonical indicators.",
            },
            {
              key: "filterPrivateIPs" as const,
              label: "Filter RFC1918 private & reserved IP ranges",
              desc: "Exclude 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, and loopback addresses.",
            },
            {
              key: "filterBenignDomains" as const,
              label: "Filter common benign vendor domains",
              desc: "Suppress noise from allowlisted domains such as microsoft.com and github.com.",
            },
            {
              key: "enableAIEnrichment" as const,
              label: "Allow optional Gemini AI threat insights",
              desc: "Permits sending report text to the server-side Gemini endpoint when you request AI Insights.",
            },
          ].map((opt) => (
            <label
              key={opt.key}
              className="flex items-start gap-3 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B1020] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={settings.defaultOptions[opt.key]}
                onChange={(e) =>
                  updateDefaultOptions({ [opt.key]: e.target.checked })
                }
                className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-cyan-500"
              />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  {opt.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {opt.desc}
                </div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Benign Domain Allowlist Editor */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Benign Domain Allowlist
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Domains and subdomains excluded when "Filter benign domains" is enabled.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              updateDefaultOptions({ benignDomainsAllowlist: DEFAULT_BENIGN_DOMAINS })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 self-start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <form onSubmit={handleAddDomain} className="mt-4 flex gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="Add benign domain (e.g., corp-intranet.com)"
            aria-label="Add benign domain"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1020] font-mono text-xs text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 max-h-56 overflow-y-auto">
          {settings.defaultOptions.benignDomainsAllowlist.map((dom) => (
            <span
              key={dom}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1020] font-mono text-xs text-slate-700 dark:text-slate-300"
            >
              <span>{dom}</span>
              <button
                type="button"
                onClick={() => handleRemoveDomain(dom)}
                aria-label={`Remove ${dom}`}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </section>

      {/* Server AI Connection Status */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-6">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          AI Enrichment Service Status
        </h2>
        <div className="mt-3 flex items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1020]">
          <div className="flex items-center gap-3">
            <CheckCircle2
              className={`w-4 h-4 ${
                aiStatus?.configured ? "text-emerald-500" : "text-amber-500"
              }`}
            />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                {aiStatus === null
                  ? "Checking server AI configuration..."
                  : aiStatus.configured
                    ? "Server-side Gemini API configured"
                    : "Gemini API key not detected in environment"}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Model: <span className="font-mono">{aiStatus?.model ?? "gemini-4-hydrogen"}</span> · Managed via server environment secrets
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clear Local Data */}
      <section className="rounded-xl border border-red-500/30 bg-white dark:bg-[#10182E] p-6">
        <h2 className="font-display text-base font-semibold text-red-600 dark:text-red-400">
          Clear Local Storage Data
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Permanently remove all saved incident history, cached AI insights, and custom allowlist edits from this browser.
        </p>

        {!confirmClear ? (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Workspace Data</span>
          </button>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                clearAllData();
                setConfirmClear(false);
              }}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
            >
              Confirm Permanent Reset
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
