import { IOCType } from "../types/ioc";

export interface IOCTypeMeta {
  type: IOCType;
  label: string;
  shortLabel: string;
  pluralLabel: string;
  description: string;
  badgeClass: string;
  highlightClass: string;
  chartColor: string;
}

export const IOC_TYPE_ORDER: IOCType[] = [
  "ip",
  "domain",
  "url",
  "email",
  "hash",
  "cve",
  "filepath",
  "registry",
  "wallet",
];

export const IOC_TYPE_META: Record<IOCType, IOCTypeMeta> = {
  ip: {
    type: "ip",
    label: "IP / CIDR",
    shortLabel: "IP",
    pluralLabel: "IPs",
    description: "IPv4, IPv6, and CIDR network ranges",
    badgeClass:
      "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30",
    highlightClass:
      "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-b-2 border-cyan-400",
    chartColor: "#22D3EE",
  },
  domain: {
    type: "domain",
    label: "Domain",
    shortLabel: "Domain",
    pluralLabel: "Domains",
    description: "Validated hostnames and FQDNs against bundled TLD set",
    badgeClass:
      "bg-violet-500/12 text-violet-700 dark:text-violet-300 border border-violet-500/30",
    highlightClass:
      "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-b-2 border-violet-400",
    chartColor: "#8B5CF6",
  },
  url: {
    type: "url",
    label: "URL",
    shortLabel: "URL",
    pluralLabel: "URLs",
    description: "HTTP, HTTPS, and FTP uniform resource locators",
    badgeClass:
      "bg-sky-500/12 text-sky-700 dark:text-sky-300 border border-sky-500/30",
    highlightClass:
      "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-b-2 border-sky-400",
    chartColor: "#38BDF8",
  },
  email: {
    type: "email",
    label: "Email",
    shortLabel: "Email",
    pluralLabel: "Emails",
    description: "Sender, reply-to, and extortion contact addresses",
    badgeClass:
      "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
    highlightClass:
      "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-b-2 border-emerald-400",
    chartColor: "#10B981",
  },
  hash: {
    type: "hash",
    label: "File Hash",
    shortLabel: "Hash",
    pluralLabel: "Hashes",
    description: "MD5, SHA-1, SHA-256, and SHA-512 cryptographic digests",
    badgeClass:
      "bg-rose-500/12 text-rose-700 dark:text-rose-300 border border-rose-500/30",
    highlightClass:
      "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-b-2 border-rose-400",
    chartColor: "#F43F5E",
  },
  cve: {
    type: "cve",
    label: "CVE ID",
    shortLabel: "CVE",
    pluralLabel: "CVEs",
    description: "Common Vulnerabilities and Exposures identifiers",
    badgeClass:
      "bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/30",
    highlightClass:
      "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-b-2 border-amber-400",
    chartColor: "#F59E0B",
  },
  filepath: {
    type: "filepath",
    label: "File Path",
    shortLabel: "Path",
    pluralLabel: "File paths",
    description: "Windows/Unix paths and suspicious executable/script artifacts",
    badgeClass:
      "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30",
    highlightClass:
      "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-b-2 border-indigo-400",
    chartColor: "#6366F1",
  },
  registry: {
    type: "registry",
    label: "Registry Key",
    shortLabel: "Registry",
    pluralLabel: "Registry keys",
    description: "Windows HKLM/HKCU persistence and configuration paths",
    badgeClass:
      "bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-500/30",
    highlightClass:
      "bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-200 border-b-2 border-fuchsia-400",
    chartColor: "#D946EF",
  },
  wallet: {
    type: "wallet",
    label: "Crypto Wallet",
    shortLabel: "Wallet",
    pluralLabel: "Wallets",
    description: "Bitcoin (Legacy/Bech32) and Ethereum payment addresses",
    badgeClass:
      "bg-orange-500/12 text-orange-700 dark:text-orange-300 border border-orange-500/30",
    highlightClass:
      "bg-orange-500/15 text-orange-800 dark:text-orange-200 border-b-2 border-orange-400",
    chartColor: "#FB923C",
  },
};
