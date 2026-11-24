import { AIInsightsResult, ExtractedIOC, ExtractionResult, IOCType } from "../../types/ioc";

function generateUUIDv4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function escapeStixValue(val: string): string {
  return val.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function toStixPattern(ioc: ExtractedIOC): string {
  const escaped = escapeStixValue(ioc.value);
  switch (ioc.type) {
    case "ip":
      if (ioc.subtype?.includes("IPv6")) {
        return `[ipv6-addr:value = '${escaped}']`;
      }
      return `[ipv4-addr:value = '${escaped}']`;
    case "domain":
      return `[domain-name:value = '${escaped}']`;
    case "url":
      return `[url:value = '${escaped}']`;
    case "email":
      return `[email-addr:value = '${escaped}']`;
    case "hash": {
      const algo =
        ioc.subtype === "MD5"
          ? "MD5"
          : ioc.subtype === "SHA-1"
            ? "SHA-1"
            : ioc.subtype === "SHA-512"
              ? "SHA-512"
              : "SHA-256";
      return `[file:hashes.'${algo}' = '${escaped}']`;
    }
    case "cve":
      return `[vulnerability:name = '${escaped}']`;
    case "filepath":
      return `[file:name = '${escaped}']`;
    case "registry":
      return `[windows-registry-key:key = '${escaped}']`;
    case "wallet":
      return `[x-crypto-wallet:address = '${escaped}']`;
    default:
      return `[x-iocscope:value = '${escaped}']`;
  }
}

export function exportAsJSON(
  result: ExtractionResult,
  meta?: { title?: string; aiInsights?: AIInsightsResult | null }
): string {
  const activeIOCs = result.iocs.filter((i) => !i.isFalsePositive);
  const payload = {
    tool: "IOCScope",
    exportedAt: new Date().toISOString(),
    title: meta?.title || "Incident IOC Report",
    summary: result.summary,
    indicators: activeIOCs.map((i) => ({
      value: i.value,
      originalValues: i.originalValues,
      type: i.type,
      subtype: i.subtype,
      occurrences: i.occurrences,
      confidence: i.confidence,
      confidenceScore: i.confidenceScore,
      isDefanged: i.isDefanged,
      contextSnippet: i.contextSnippet,
    })),
    aiInsights: meta?.aiInsights ?? null,
  };
  return JSON.stringify(payload, null, 2);
}

function csvCell(val: string | number | boolean): string {
  const str = String(val ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportAsCSV(result: ExtractionResult): string {
  const activeIOCs = result.iocs.filter((i) => !i.isFalsePositive);
  const headers = [
    "Value",
    "Type",
    "Subtype",
    "Occurrences",
    "Confidence",
    "Defanged_In_Source",
    "Original_Representations",
    "Context_Snippet",
  ];
  const rows = activeIOCs.map((i) =>
    [
      csvCell(i.value),
      csvCell(i.type),
      csvCell(i.subtype ?? ""),
      csvCell(i.occurrences),
      csvCell(i.confidence),
      csvCell(i.isDefanged),
      csvCell(i.originalValues.join(" | ")),
      csvCell(i.contextSnippet),
    ].join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function exportAsPlainText(result: ExtractionResult): string {
  const activeIOCs = result.iocs.filter((i) => !i.isFalsePositive);
  const grouped = new Map<IOCType, ExtractedIOC[]>();
  for (const item of activeIOCs) {
    const arr = grouped.get(item.type) ?? [];
    arr.push(item);
    grouped.set(item.type, arr);
  }

  const lines: string[] = [
    `IOCScope Indicator Export (${new Date().toISOString()})`,
    `Unique Indicators: ${activeIOCs.length} | Risk Score: ${result.summary.riskScore}/100 (${result.summary.riskLevel})`,
    "",
  ];

  for (const [type, list] of grouped.entries()) {
    lines.push(`[${type.toUpperCase()}]`);
    for (const item of list) {
      lines.push(`${item.value}  (occurrences=${item.occurrences}, confidence=${item.confidence})`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function exportAsSTIX21(
  result: ExtractionResult,
  title = "IOCScope Threat Report"
): string {
  const now = new Date().toISOString();
  const identityId = `identity--${generateUUIDv4()}`;
  const activeIOCs = result.iocs.filter((i) => !i.isFalsePositive);

  const identityObj = {
    type: "identity",
    spec_version: "2.1",
    id: identityId,
    created: now,
    modified: now,
    name: "IOCScope Automated Extractor",
    identity_class: "system",
  };

  const indicators = activeIOCs.map((ioc) => ({
    type: "indicator",
    spec_version: "2.1",
    id: `indicator--${generateUUIDv4()}`,
    created: now,
    modified: now,
    created_by_ref: identityId,
    name: `${ioc.type.toUpperCase()}: ${ioc.value}`,
    description: `Extracted from "${title}". Context: ${ioc.contextSnippet}`,
    indicator_types: ["malicious-activity"],
    pattern: toStixPattern(ioc),
    pattern_type: "stix",
    valid_from: now,
    confidence: ioc.confidenceScore,
    labels: [ioc.type, ioc.subtype ?? ioc.type, `confidence:${ioc.confidence.toLowerCase()}`],
  }));

  const bundle = {
    type: "bundle",
    id: `bundle--${generateUUIDv4()}`,
    objects: [identityObj, ...indicators],
  };

  return JSON.stringify(bundle, null, 2);
}

export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
