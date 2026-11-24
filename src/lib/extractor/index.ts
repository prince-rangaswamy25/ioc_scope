import {
  ConfidenceLevel,
  ExtractedIOC,
  ExtractionOptions,
  ExtractionResult,
  IOCMatchSpan,
  IOCType,
} from "../../types/ioc";
import { hasDefangMarkers, refangIndicator } from "../defang";
import {
  DEFAULT_BENIGN_DOMAINS,
  isBenignDomain,
  isPrivateOrReservedIPv4,
  isPrivateOrReservedIPv6,
  isValidCIDR,
  isValidCVE,
  isValidDomain,
  isValidEmail,
  isValidHash,
  isValidIPv4,
  isValidIPv6,
  isValidURL,
  validateWalletAddress,
} from "../validators";

/**
 * Deterministic client-side IOC extraction engine.
 * Supports defanged & live indicators across 9 threat intelligence categories:
 * IPv4/IPv6/CIDR, Domains, URLs, Emails, Hashes (MD5/SHA1/SHA256/SHA512),
 * CVEs, File paths & suspicious filenames, Windows Registry keys, and BTC/ETH Wallets.
 */

const HIGH_CONFIDENCE_CONTEXT =
  /\b(malware|ransomware|payload|dropper|beacon|beaconing|c2|command[- ]and[- ]control|phishing|malicious|exploit|compromis|exfiltrat|ioc|indicator|backdoor|trojan|cobalt\s*strike|mimikatz|quarantin|hash|sha256|sha1|md5|threat|attacker|adversary|cobalt|implant|loader|stealer)\b/i;

const LOW_CONFIDENCE_CONTEXT =
  /\b(benign|whitelist|allowlist|false\s*positive|internal\s*test|legitimate|vendor|documentation|example|reference|baseline)\b/i;

const SUSPICIOUS_EXTENSIONS =
  "exe|dll|sys|ps1|psm1|bat|cmd|vbs|vbe|js|jse|wsf|wsh|hta|scr|msi|msp|jar|py|sh|elf|docm|xlsm|pptm|lnk|iso|img|dmp";

/**
 * Regex definitions ordered by specificity.
 * Defang markers like [.], (.), {.}, [dot], [at], [://] are captured directly in the raw span
 * so inline highlighting aligns 1:1 with the analyst's original text.
 */
const PATTERNS = {
  // URLs including defanged protocols (hxxp, hxxps, fxp) and defanged host dots ([.], (.), {.}, [dot])
  url: /\b(?:https?|hxxps?|ftp|fxp)(?:\[:\/\/\]|\(:\/\/\)|\{:\/\/\}|\[:\]\/\/|\(:\)\/\/|:\/\/)[^\s<>"'`]+/gi,

  // Emails including [at], (at), [@], (@), and defanged dots in the domain part
  email:
    /\b[a-zA-Z0-9._%+-]+(?:\s*(?:\[@\]|\(@\)|\[at\]|\(at\)|\{at\})\s*|@)[a-zA-Z0-9-]+(?:(?:\[\.\]|\(\.\)|\{\.\}|\[dot\]|\(dot\)|\.)[a-zA-Z0-9-]+)+\b/gi,

  // Windows Registry keys (HKLM, HKCU, HKCR, HKU, HKCC and full hive names)
  // Allows spaces inside subkey names like "Windows Defender" only when followed by "\" or capitalized key tokens, stopping before prose sentences.
  registry:
    /\b(?:HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER|HKEY_CLASSES_ROOT|HKEY_USERS|HKEY_CURRENT_CONFIG|HKLM|HKCU|HKCR|HKU|HKCC)\\[^\s\r\n"'`<>|]+(?:\s+(?:Defender|NT|Settings|Explorer|Policies|Control|Panel|Services|CurrentVersion)[^\s\r\n"'`<>|]*)*/gi,

  // CVE Identifiers (e.g., CVE-2024-3094)
  cve: /\bCVE-\d{4}-\d{4,7}\b/gi,

  // Cryptographic hashes (MD5=32, SHA-1=40, SHA-256=64, SHA-512=128)
  hash: /\b[a-fA-F0-9]{32}\b|\b[a-fA-F0-9]{40}\b|\b[a-fA-F0-9]{64}\b|\b[a-fA-F0-9]{128}\b/g,

  // Bitcoin & Ethereum Wallets
  wallet: /\b(?:0x[a-fA-F0-9]{40}|bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{25,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g,

  // IPv4 & CIDR (supports defanged dots like 185[.]220[.]101[.]42 or 185[dot]220...)
  ipv4OrCidr:
    /\b(?:\d{1,3}(?:\[\.\]|\(\.\)|\{\.\}|\[dot\]|\(dot\)|\.)){3}\d{1,3}(?:\/\d{1,2})?\b/g,

  // IPv6 (full and compressed forms)
  ipv6: /(?:^|[\s(\["'])((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7}|::1)(?:\/\d{1,3})?(?=$|[\s)\]"',.;])/g,

  // Windows File Paths (C:\..., %APPDATA%\..., \\server\share\...)
  windowsPath:
    /(?:[a-zA-Z]:\\|%[a-zA-Z0-9_()]+%\\|\\\\[a-zA-Z0-9._-]+\\)[^\r\n"'`<>|*?]+/g,

  // Linux / macOS File Paths (/tmp/..., /var/..., /etc/..., /usr/..., /opt/..., /home/...)
  linuxPath:
    /(?:^|[\s"'`(])(\/(?:tmp|var|etc|usr|opt|home|root|bin|sbin|dev|proc|run|Library|Users)\/[^\s"'`<>|;,)]+)/g,

  // Standalone suspicious filenames (e.g., payload.ps1, dropper.exe, invoice_2026.docm)
  suspiciousFilename: new RegExp(
    `\\b[a-zA-Z0-9._-]+\\.(?:${SUSPICIOUS_EXTENSIONS})\\b`,
    "gi"
  ),

  // Domains (live or defanged with [.], (.), {.}, [dot], (dot))
  domain:
    /\b[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:(?:\[\.\]|\(\.\)|\{\.\}|\[dot\]|\(dot\)|\.)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\b/gi,
};

interface RawCandidate {
  start: number;
  end: number;
  rawText: string;
  normalizedValue: string;
  type: IOCType;
  subtype?: string;
  wasDefanged: boolean;
  isPrivateOrReserved?: boolean;
  priority: number; // Higher wins when spans overlap
}

function getContextSnippet(text: string, start: number, end: number, radius = 65): string {
  const s = Math.max(0, start - radius);
  const e = Math.min(text.length, end + radius);
  const prefix = s > 0 ? "..." : "";
  const suffix = e < text.length ? "..." : "";
  return `${prefix}${text.slice(s, e).replace(/\s+/g, " ").trim()}${suffix}`;
}

function scoreConfidence(
  type: IOCType,
  context: string,
  wasDefanged: boolean,
  subtype?: string
): { confidence: ConfidenceLevel; score: number } {
  let score = 60;

  if (type === "hash") {
    score = subtype === "SHA-256" || subtype === "SHA-512" ? 90 : 82;
  } else if (type === "cve") {
    score = 92;
  } else if (type === "url") {
    score = 78;
  } else if (type === "registry") {
    score = 84;
  } else if (type === "wallet") {
    score = 80;
  } else if (type === "ip") {
    score = 74;
  } else if (type === "filepath") {
    score = 72;
  } else if (type === "email") {
    score = 68;
  } else if (type === "domain") {
    score = 55;
  }

  if (wasDefanged) score += 12;
  if (HIGH_CONFIDENCE_CONTEXT.test(context)) score += 14;
  if (LOW_CONFIDENCE_CONTEXT.test(context)) score -= 24;

  const clamped = Math.max(15, Math.min(99, score));
  const confidence: ConfidenceLevel =
    clamped >= 78 ? "High" : clamped >= 52 ? "Medium" : "Low";

  return { confidence, score: clamped };
}

function computeRiskScore(iocs: ExtractedIOC[]): {
  riskScore: number;
  riskLevel: "Critical" | "High" | "Medium" | "Low";
} {
  const active = iocs.filter((i) => !i.isFalsePositive);
  if (active.length === 0) {
    return { riskScore: 0, riskLevel: "Low" };
  }

  const weights: Record<IOCType, number> = {
    hash: 14,
    cve: 15,
    registry: 12,
    wallet: 14,
    url: 10,
    ip: 9,
    filepath: 9,
    email: 7,
    domain: 6,
  };

  let raw = 0;
  for (const item of active) {
    const base = weights[item.type] ?? 7;
    const confFactor =
      item.confidence === "High" ? 1.25 : item.confidence === "Medium" ? 1.0 : 0.6;
    const privFactor = item.isPrivateOrReserved ? 0.5 : 1.0;
    const occBonus = Math.min(4, Math.max(0, item.occurrences - 1) * 1.2);
    raw += base * confFactor * privFactor + occBonus;
  }

  // Type diversity bonus (multi-stage indicators imply higher confidence of real incident)
  const distinctTypes = new Set(active.map((i) => i.type)).size;
  raw += distinctTypes * 4;

  const riskScore = Math.min(100, Math.round(100 * (1 - Math.exp(-raw / 55))));
  const riskLevel =
    riskScore >= 75
      ? "Critical"
      : riskScore >= 50
        ? "High"
        : riskScore >= 25
          ? "Medium"
          : "Low";

  return { riskScore, riskLevel };
}

export const DEFAULT_EXTRACTION_OPTIONS: ExtractionOptions = {
  refangDefanged: true,
  filterPrivateIPs: true,
  filterBenignDomains: true,
  benignDomainsAllowlist: DEFAULT_BENIGN_DOMAINS,
  enableAIEnrichment: true,
};

/**
 * Synchronous extraction suitable for standard incident reports and unit tests.
 */
export function extractIOCs(
  text: string,
  partialOptions?: Partial<ExtractionOptions>
): ExtractionResult {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const options: ExtractionOptions = {
    ...DEFAULT_EXTRACTION_OPTIONS,
    ...partialOptions,
    benignDomainsAllowlist:
      partialOptions?.benignDomainsAllowlist ?? DEFAULT_EXTRACTION_OPTIONS.benignDomainsAllowlist,
  };

  const emptyByType: Record<IOCType, number> = {
    ip: 0,
    domain: 0,
    url: 0,
    email: 0,
    hash: 0,
    cve: 0,
    filepath: 0,
    registry: 0,
    wallet: 0,
  };

  if (!text || !text.trim()) {
    return {
      iocs: [],
      spans: [],
      summary: {
        totalOccurrences: 0,
        uniqueCount: 0,
        byType: emptyByType,
        riskScore: 0,
        riskLevel: "Low",
        processingTimeMs: 0,
        charCount: 0,
        wordCount: 0,
      },
      filteredOutCount: 0,
    };
  }

  const candidates: RawCandidate[] = [];
  let filteredOutCount = 0;

  // 1. URLs (highest priority over embedded domains/IPs/filenames)
  PATTERNS.url.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PATTERNS.url.exec(text)) !== null) {
    let rawText = m[0].replace(/[.,;:!?]+$/, "");
    while (
      (rawText.endsWith(")") && !rawText.includes("(")) ||
      (rawText.endsWith("]") && !rawText.includes("["))
    ) {
      rawText = rawText.slice(0, -1).replace(/[.,;:!?]+$/, "");
    }
    if (!rawText) continue;
    const { refanged, wasDefanged } = refangIndicator(rawText);
    if (!isValidURL(refanged)) continue;

    // Optionally skip benign URLs when domain filter is active
    try {
      const host = new URL(refanged).hostname;
      if (options.filterBenignDomains && isBenignDomain(host, options.benignDomainsAllowlist)) {
        filteredOutCount++;
        continue;
      }
      if (options.filterPrivateIPs && isValidIPv4(host) && isPrivateOrReservedIPv4(host)) {
        filteredOutCount++;
        continue;
      }
    } catch {
      continue;
    }

    candidates.push({
      start: m.index,
      end: m.index + rawText.length,
      rawText,
      normalizedValue: options.refangDefanged ? refanged : rawText,
      type: "url",
      subtype: refanged.startsWith("https") ? "HTTPS" : refanged.startsWith("ftp") ? "FTP" : "HTTP",
      wasDefanged,
      priority: 100,
    });
  }

  // 2. Emails (priority over bare domains)
  PATTERNS.email.lastIndex = 0;
  while ((m = PATTERNS.email.exec(text)) !== null) {
    const rawText = m[0];
    const { refanged, wasDefanged } = refangIndicator(rawText);
    const cleanedEmail = refanged.replace(/\s+/g, "").toLowerCase();
    if (!isValidEmail(cleanedEmail)) continue;

    const domainPart = cleanedEmail.split("@")[1];
    if (options.filterBenignDomains && isBenignDomain(domainPart, options.benignDomainsAllowlist)) {
      filteredOutCount++;
      continue;
    }

    candidates.push({
      start: m.index,
      end: m.index + rawText.length,
      rawText,
      normalizedValue: options.refangDefanged ? cleanedEmail : rawText,
      type: "email",
      subtype: "SMTP",
      wasDefanged,
      priority: 95,
    });
  }

  // 3. Registry Keys (priority over file paths/domains inside keys)
  PATTERNS.registry.lastIndex = 0;
  while ((m = PATTERNS.registry.exec(text)) !== null) {
    const rawText = m[0].replace(/[.,;]+$/, "");
    if (rawText.length < 8) continue;
    candidates.push({
      start: m.index,
      end: m.index + rawText.length,
      rawText,
      normalizedValue: rawText,
      type: "registry",
      subtype: rawText.split("\\")[0].toUpperCase(),
      wasDefanged: false,
      priority: 92,
    });
  }

  // 4. CVEs
  PATTERNS.cve.lastIndex = 0;
  while ((m = PATTERNS.cve.exec(text)) !== null) {
    const rawText = m[0];
    if (!isValidCVE(rawText)) continue;
    candidates.push({
      start: m.index,
      end: m.index + rawText.length,
      rawText,
      normalizedValue: rawText.toUpperCase(),
      type: "cve",
      subtype: "NVD",
      wasDefanged: false,
      priority: 90,
    });
  }

  // 5. Hashes (MD5, SHA-1, SHA-256, SHA-512)
  PATTERNS.hash.lastIndex = 0;
  while ((m = PATTERNS.hash.exec(text)) !== null) {
    const rawText = m[0];
    const check = isValidHash(rawText);
    if (!check.valid) continue;
    candidates.push({
      start: m.index,
      end: m.index + rawText.length,
      rawText,
      normalizedValue: rawText.toLowerCase(),
      type: "hash",
      subtype: check.subtype,
      wasDefanged: false,
      priority: 88,
    });
  }

  // 6. Crypto Wallets (BTC & ETH)
  PATTERNS.wallet.lastIndex = 0;
  while ((m = PATTERNS.wallet.exec(text)) !== null) {
    const rawText = m[0];
    const check = validateWalletAddress(rawText);
    if (!check.valid) continue;
    candidates.push({
      start: m.index,
      end: m.index + rawText.length,
      rawText,
      normalizedValue: rawText,
      type: "wallet",
      subtype: check.subtype,
      wasDefanged: false,
      priority: 86,
    });
  }

  // 7. IPv4 & CIDR
  PATTERNS.ipv4OrCidr.lastIndex = 0;
  while ((m = PATTERNS.ipv4OrCidr.exec(text)) !== null) {
    const rawText = m[0];
    const { refanged, wasDefanged } = refangIndicator(rawText);
    const isCidr = refanged.includes("/");
    const valid = isCidr ? isValidCIDR(refanged) : isValidIPv4(refanged);
    if (!valid) continue;

    const ipOnly = isCidr ? refanged.split("/")[0] : refanged;
    const isPriv = isPrivateOrReservedIPv4(ipOnly);
    if (options.filterPrivateIPs && isPriv) {
      filteredOutCount++;
      continue;
    }

    candidates.push({
      start: m.index,
      end: m.index + rawText.length,
      rawText,
      normalizedValue: options.refangDefanged ? refanged : rawText,
      type: "ip",
      subtype: isCidr ? "CIDR" : "IPv4",
      wasDefanged,
      isPrivateOrReserved: isPriv,
      priority: 84,
    });
  }

  // 8. IPv6
  PATTERNS.ipv6.lastIndex = 0;
  while ((m = PATTERNS.ipv6.exec(text)) !== null) {
    const captured = m[1];
    if (!captured) continue;
    const offset = m.index + m[0].indexOf(captured);
    const isCidr = captured.includes("/");
    const valid = isCidr ? isValidCIDR(captured) : isValidIPv6(captured);
    if (!valid) continue;

    const ipOnly = isCidr ? captured.split("/")[0] : captured;
    const isPriv = isPrivateOrReservedIPv6(ipOnly);
    if (options.filterPrivateIPs && isPriv) {
      filteredOutCount++;
      continue;
    }

    candidates.push({
      start: offset,
      end: offset + captured.length,
      rawText: captured,
      normalizedValue: captured.toLowerCase(),
      type: "ip",
      subtype: isCidr ? "IPv6 CIDR" : "IPv6",
      wasDefanged: false,
      isPrivateOrReserved: isPriv,
      priority: 83,
    });
  }

  // 9. Windows File Paths
  PATTERNS.windowsPath.lastIndex = 0;
  while ((m = PATTERNS.windowsPath.exec(text)) !== null) {
    const rawText = m[0].replace(/[.,;)]+$/, "");
    if (rawText.length < 5) continue;
    candidates.push({
      start: m.index,
      end: m.index + rawText.length,
      rawText,
      normalizedValue: rawText,
      type: "filepath",
      subtype: "Windows",
      wasDefanged: false,
      priority: 76,
    });
  }

  // 10. Linux / macOS File Paths
  PATTERNS.linuxPath.lastIndex = 0;
  while ((m = PATTERNS.linuxPath.exec(text)) !== null) {
    const captured = m[1].replace(/[.,;)]+$/, "");
    if (captured.length < 6) continue;
    const offset = m.index + m[0].indexOf(captured);
    candidates.push({
      start: offset,
      end: offset + captured.length,
      rawText: captured,
      normalizedValue: captured,
      type: "filepath",
      subtype: "Unix",
      wasDefanged: false,
      priority: 75,
    });
  }

  // 11. Standalone Suspicious Filenames
  PATTERNS.suspiciousFilename.lastIndex = 0;
  while ((m = PATTERNS.suspiciousFilename.exec(text)) !== null) {
    const rawText = m[0];
    candidates.push({
      start: m.index,
      end: m.index + rawText.length,
      rawText,
      normalizedValue: rawText,
      type: "filepath",
      subtype: "Artifact",
      wasDefanged: false,
      priority: 72,
    });
  }

  // 12. Domains (lowest priority so URLs, emails, and filenames win overlaps)
  PATTERNS.domain.lastIndex = 0;
  while ((m = PATTERNS.domain.exec(text)) !== null) {
    const rawText = m[0];
    const { refanged, wasDefanged } = refangIndicator(rawText);
    const lower = refanged.toLowerCase();
    if (!isValidDomain(lower)) continue;

    if (options.filterBenignDomains && isBenignDomain(lower, options.benignDomainsAllowlist)) {
      filteredOutCount++;
      continue;
    }

    candidates.push({
      start: m.index,
      end: m.index + rawText.length,
      rawText,
      normalizedValue: options.refangDefanged ? lower : rawText,
      type: "domain",
      subtype: wasDefanged ? "Defanged FQDN" : "FQDN",
      wasDefanged: wasDefanged || hasDefangMarkers(rawText),
      priority: 60,
    });
  }

  // Resolve overlapping spans: higher priority first, then longer span first
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (b.end - b.start !== a.end - a.start) return b.end - b.start - (a.end - a.start);
    return a.start - b.start;
  });

  const accepted: RawCandidate[] = [];
  for (const cand of candidates) {
    const overlaps = accepted.some(
      (ex) => cand.start < ex.end && cand.end > ex.start
    );
    if (!overlaps) {
      accepted.push(cand);
    }
  }

  // Sort accepted spans chronologically by text position for inline highlighting
  accepted.sort((a, b) => a.start - b.start);

  // Deduplicate by (type + canonical lowercase value)
  const map = new Map<string, ExtractedIOC>();
  const spans: IOCMatchSpan[] = [];

  for (const cand of accepted) {
    const key = `${cand.type}::${cand.normalizedValue.toLowerCase()}`;
    const context = getContextSnippet(text, cand.start, cand.end);
    const { confidence, score } = scoreConfidence(
      cand.type,
      context,
      cand.wasDefanged,
      cand.subtype
    );

    let existing = map.get(key);
    if (!existing) {
      const id = `ioc_${cand.type}_${map.size + 1}`;
      existing = {
        id,
        value: cand.normalizedValue,
        originalValues: [cand.rawText],
        type: cand.type,
        subtype: cand.subtype,
        occurrences: 1,
        confidence,
        confidenceScore: score,
        contextSnippet: context,
        isDefanged: cand.wasDefanged,
        isPrivateOrReserved: cand.isPrivateOrReserved,
        isFalsePositive: false,
      };
      map.set(key, existing);
    } else {
      existing.occurrences += 1;
      if (!existing.originalValues.includes(cand.rawText)) {
        existing.originalValues.push(cand.rawText);
      }
      if (cand.wasDefanged) existing.isDefanged = true;
      if (score > existing.confidenceScore) {
        existing.confidenceScore = score;
        existing.confidence = confidence;
        existing.contextSnippet = context;
      }
    }

    spans.push({
      start: cand.start,
      end: cand.end,
      rawText: cand.rawText,
      iocId: existing.id,
      type: cand.type,
      normalizedValue: existing.value,
    });
  }

  const iocs = Array.from(map.values()).sort((a, b) => {
    if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
    return b.occurrences - a.occurrences;
  });

  const byType: Record<IOCType, number> = { ...emptyByType };
  let totalOccurrences = 0;
  for (const item of iocs) {
    byType[item.type] += 1;
    totalOccurrences += item.occurrences;
  }

  const { riskScore, riskLevel } = computeRiskScore(iocs);
  const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return {
    iocs,
    spans,
    summary: {
      totalOccurrences,
      uniqueCount: iocs.length,
      byType,
      riskScore,
      riskLevel,
      processingTimeMs: Math.max(1, Math.round(endedAt - startedAt)),
      charCount: text.length,
      wordCount,
    },
    filteredOutCount,
  };
}

/**
 * Chunked async extraction for very large incident logs (up to ~1 MB+)
 * yielding to the event loop between ~150 KB chunks to maintain 60fps UI responsiveness.
 */
export async function extractIOCsAsync(
  text: string,
  partialOptions?: Partial<ExtractionOptions>
): Promise<ExtractionResult> {
  const CHUNK_THRESHOLD = 160_000;
  if (text.length <= CHUNK_THRESHOLD) {
    return extractIOCs(text, partialOptions);
  }

  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const lines = text.split("\n");
  const chunks: Array<{ text: string; offset: number }> = [];
  let currentLines: string[] = [];
  let currentLen = 0;
  let runningOffset = 0;

  for (const line of lines) {
    currentLines.push(line);
    currentLen += line.length + 1;
    if (currentLen >= CHUNK_THRESHOLD) {
      const chunkStr = currentLines.join("\n");
      chunks.push({ text: chunkStr, offset: runningOffset });
      runningOffset += chunkStr.length + 1;
      currentLines = [];
      currentLen = 0;
    }
  }
  if (currentLines.length > 0) {
    chunks.push({ text: currentLines.join("\n"), offset: runningOffset });
  }

  const mergedMap = new Map<string, ExtractedIOC>();
  const allSpans: IOCMatchSpan[] = [];
  let totalFiltered = 0;

  for (const chunk of chunks) {
    // Yield frame to keep scanning animation & UI responsive
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const res = extractIOCs(chunk.text, partialOptions);
    totalFiltered += res.filteredOutCount;

    const localToGlobalId = new Map<string, string>();
    for (const ioc of res.iocs) {
      const key = `${ioc.type}::${ioc.value.toLowerCase()}`;
      const existing = mergedMap.get(key);
      if (!existing) {
        const globalId = `ioc_${ioc.type}_${mergedMap.size + 1}`;
        localToGlobalId.set(ioc.id, globalId);
        mergedMap.set(key, { ...ioc, id: globalId });
      } else {
        localToGlobalId.set(ioc.id, existing.id);
        existing.occurrences += ioc.occurrences;
        for (const orig of ioc.originalValues) {
          if (!existing.originalValues.includes(orig)) existing.originalValues.push(orig);
        }
        if (ioc.confidenceScore > existing.confidenceScore) {
          existing.confidenceScore = ioc.confidenceScore;
          existing.confidence = ioc.confidence;
          existing.contextSnippet = ioc.contextSnippet;
        }
      }
    }

    for (const sp of res.spans) {
      allSpans.push({
        ...sp,
        start: sp.start + chunk.offset,
        end: sp.end + chunk.offset,
        iocId: localToGlobalId.get(sp.iocId) ?? sp.iocId,
      });
    }
  }

  const iocs = Array.from(mergedMap.values()).sort((a, b) => {
    if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
    return b.occurrences - a.occurrences;
  });

  const byType: Record<IOCType, number> = {
    ip: 0,
    domain: 0,
    url: 0,
    email: 0,
    hash: 0,
    cve: 0,
    filepath: 0,
    registry: 0,
    wallet: 0,
  };
  let totalOccurrences = 0;
  for (const i of iocs) {
    byType[i.type] += 1;
    totalOccurrences += i.occurrences;
  }

  const { riskScore, riskLevel } = computeRiskScore(iocs);
  const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return {
    iocs,
    spans: allSpans,
    summary: {
      totalOccurrences,
      uniqueCount: iocs.length,
      byType,
      riskScore,
      riskLevel,
      processingTimeMs: Math.max(1, Math.round(endedAt - startedAt)),
      charCount: text.length,
      wordCount,
    },
    filteredOutCount: totalFiltered,
  };
}

/**
 * Recalculates summary metrics after an analyst toggles false-positive flags on extracted IOCs.
 */
export function recalculateSummary(result: ExtractionResult): ExtractionResult {
  const { riskScore, riskLevel } = computeRiskScore(result.iocs);
  const byType: Record<IOCType, number> = {
    ip: 0,
    domain: 0,
    url: 0,
    email: 0,
    hash: 0,
    cve: 0,
    filepath: 0,
    registry: 0,
    wallet: 0,
  };

  let uniqueCount = 0;
  let totalOccurrences = 0;
  for (const item of result.iocs) {
    if (!item.isFalsePositive) {
      byType[item.type] += 1;
      uniqueCount += 1;
      totalOccurrences += item.occurrences;
    }
  }

  return {
    ...result,
    summary: {
      ...result.summary,
      byType,
      uniqueCount,
      totalOccurrences,
      riskScore,
      riskLevel,
    },
  };
}
