/**
 * Deterministic validators, bundled TLD set, private IP checks,
 * and default benign domain allowlist for reducing false positives.
 */

export const BUNDLED_TLDS = new Set<string>([
  // Generic & infrastructure TLDs
  "com", "net", "org", "edu", "gov", "mil", "int", "info", "biz", "name", "pro",
  "aero", "coop", "museum", "asia", "cat", "jobs", "mobi", "tel", "travel", "xxx",
  // Modern gTLDs commonly seen in infrastructure & threat campaigns
  "io", "co", "ai", "dev", "app", "cloud", "xyz", "top", "site", "online", "tech",
  "store", "shop", "club", "vip", "win", "bid", "click", "link", "live", "life",
  "world", "space", "fun", "icu", "cyou", "cfd", "sbs", "rest", "bar", "buzz",
  "cam", "fit", "gdn", "host", "kim", "lol", "men", "mom", "monster", "ovh",
  "page", "pics", "press", "pw", "quest", "run", "security", "solutions", "support",
  "systems", "today", "tools", "work", "zone", "center", "digital", "email",
  "expert", "finance", "group", "media", "network", "news", "services", "studio",
  "team", "ventures", "wiki", "zip", "mov",
  // Country-code TLDs (ccTLDs)
  "ac", "ad", "ae", "af", "ag", "al", "am", "ao", "ar", "as", "at", "au", "aw", "az",
  "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bm", "bn", "bo", "br", "bs", "bt", "bw", "by", "bz",
  "ca", "cc", "cd", "cf", "cg", "ch", "ci", "ck", "cl", "cm", "cn", "cr", "cu", "cv", "cw", "cx", "cy", "cz",
  "de", "dj", "dk", "dm", "do", "dz",
  "ec", "ee", "eg", "es", "et", "eu",
  "fi", "fj", "fk", "fm", "fo", "fr",
  "ga", "gb", "gd", "ge", "gf", "gg", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw", "gy",
  "hk", "hm", "hn", "hr", "ht", "hu",
  "id", "ie", "il", "im", "in", "iq", "ir", "is", "it",
  "je", "jm", "jo", "jp",
  "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz",
  "la", "lb", "lc", "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly",
  "ma", "mc", "md", "me", "mg", "mh", "mk", "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz",
  "na", "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr", "nu", "nz",
  "om",
  "pa", "pe", "pf", "pg", "ph", "pk", "pl", "pm", "pn", "pr", "ps", "pt", "pw", "py",
  "qa",
  "re", "ro", "rs", "ru", "rw",
  "sa", "sb", "sc", "sd", "se", "sg", "sh", "si", "sk", "sl", "sm", "sn", "so", "sr", "ss", "st", "su", "sv", "sx", "sy", "sz",
  "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tr", "tt", "tv", "tw", "tz",
  "ua", "ug", "uk", "us", "uy", "uz",
  "va", "vc", "ve", "vg", "vi", "vn", "vu",
  "wf", "ws",
  "ye", "yt",
  "za", "zm", "zw",
  // Special / onion
  "onion",
]);

export const DEFAULT_BENIGN_DOMAINS: string[] = [
  "microsoft.com",
  "windows.com",
  "windowsupdate.com",
  "office.com",
  "live.com",
  "google.com",
  "googleapis.com",
  "gstatic.com",
  "github.com",
  "githubusercontent.com",
  "apple.com",
  "icloud.com",
  "amazon.com",
  "amazonaws.com",
  "cloudflare.com",
  "w3.org",
  "schema.org",
  "ietf.org",
  "nist.gov",
  "mitre.org",
  "virustotal.com",
  "abuseipdb.com",
  "shodan.io",
  "example.com",
  "example.org",
  "example.net",
  "localhost.localdomain",
];

// File extensions that often look like domains in prose (e.g., "svchost.exe", "report.pdf")
const FILE_EXTENSIONS_COLLIDING_WITH_TLDS = new Set<string>([
  "exe", "dll", "sys", "bat", "cmd", "ps1", "vbs", "js", "jse", "wsf", "hta",
  "scr", "pif", "msi", "msp", "jar", "war", "py", "pyc", "rb", "sh", "bash",
  "pl", "php", "asp", "aspx", "jsp", "doc", "docx", "docm", "xls", "xlsx",
  "xlsm", "ppt", "pptx", "pptm", "pdf", "txt", "log", "csv", "json", "xml",
  "yaml", "yml", "ini", "cfg", "conf", "reg", "dmp", "tmp", "bak", "zip",
  "rar", "7z", "tar", "gz", "iso", "img", "lnk", "elf", "bin", "so", "dylib",
  "png", "jpg", "jpeg", "gif", "svg", "webp", "html", "htm", "css", "ts", "tsx",
]);

/**
 * Validates an IPv4 address string (four octets 0..255 without leading zeros on multi-digit octets).
 */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return false;
    if (part.length > 1 && part.startsWith("0")) return false;
    const num = Number(part);
    if (num < 0 || num > 255) return false;
  }
  return true;
}

/**
 * Checks whether a valid IPv4 address falls inside private, loopback, link-local,
 * CGNAT, multicast, or documentation reserved ranges.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  if (!isValidIPv4(ip)) return false;
  const [a, b, c] = ip.split(".").map(Number);

  if (a === 10) return true; // 10.0.0.0/8 RFC1918
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 RFC1918
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 RFC1918
  if (a === 127) return true; // 127.0.0.0/8 Loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 Link-local
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 IETF
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // Multicast & Reserved
  return false;
}

/**
 * Validates IPv4 or IPv6 CIDR notation.
 */
export function isValidCIDR(cidr: string): boolean {
  const slashIdx = cidr.lastIndexOf("/");
  if (slashIdx === -1) return false;
  const addr = cidr.slice(0, slashIdx);
  const prefixStr = cidr.slice(slashIdx + 1);
  if (!/^\d{1,3}$/.test(prefixStr)) return false;
  const prefix = Number(prefixStr);

  if (isValidIPv4(addr)) {
    return prefix >= 0 && prefix <= 32;
  }
  if (isValidIPv6(addr)) {
    return prefix >= 0 && prefix <= 128;
  }
  return false;
}

/**
 * Validates standard and compressed IPv6 addresses.
 */
export function isValidIPv6(ip: string): boolean {
  if (!ip.includes(":")) return false;
  // Reject bare time strings like 12:34:56
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(ip)) return false;
  const doubleColonCount = (ip.match(/::/g) || []).length;
  if (doubleColonCount > 1) return false;

  const [left, right] = ip.split("::");
  const leftParts = left ? left.split(":") : [];
  const rightParts = right ? right.split(":") : [];

  const isHexGroup = (g: string) => /^[0-9a-fA-F]{1,4}$/.test(g);
  if (!leftParts.every(isHexGroup) || !rightParts.every(isHexGroup)) {
    return false;
  }

  const totalGroups = leftParts.length + rightParts.length;
  if (doubleColonCount === 1) {
    return totalGroups < 8;
  }
  return totalGroups === 8;
}

export function isPrivateOrReservedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("2001:db8:")
  );
}

/**
 * Validates domain names against RFC label rules, bundled TLD set,
 * and rejects filenames masquerading as domains (e.g. payload.zip? No, .zip is also a TLD — handled via context/collision checks).
 */
export function isValidDomain(domain: string): boolean {
  const clean = domain.toLowerCase().replace(/\.$/, "");
  if (clean.length < 4 || clean.length > 253) return false;
  if (!clean.includes(".")) return false;
  if (isValidIPv4(clean)) return false;

  const labels = clean.split(".");
  if (labels.length < 2) return false;

  const tld = labels[labels.length - 1];
  if (!BUNDLED_TLDS.has(tld)) return false;

  // Guard against common file names matching .py, .sh, .pl, .zip, .mov, .md, .rs, .ts, .js
  if (labels.length === 2 && FILE_EXTENSIONS_COLLIDING_WITH_TLDS.has(tld)) {
    // Allow .io, .ai, .co, .me, .tv, .cc, .dev, .app, etc. which are genuine popular TLDs
    // Reject .py, .sh, .pl, .md, .rs, .zip, .mov when bare 2-label unless explicitly in a URL
    const strictFileCollisions = new Set(["py", "sh", "pl", "md", "rs", "zip", "mov", "so", "ps", "as"]);
    if (strictFileCollisions.has(tld)) {
      return false;
    }
  }

  for (const label of labels) {
    if (label.length < 1 || label.length > 63) return false;
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) return false;
  }

  return true;
}

/**
 * Checks whether a domain matches the benign allowlist (exact match or subdomain).
 */
export function isBenignDomain(domain: string, allowlist: string[]): boolean {
  const lower = domain.toLowerCase().replace(/\.$/, "");
  return allowlist.some((allowed) => {
    const cleanAllowed = allowed.toLowerCase().trim();
    if (!cleanAllowed) return false;
    return lower === cleanAllowed || lower.endsWith(`.${cleanAllowed}`);
  });
}

/**
 * Validates URL syntax after refanging.
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:", "ftp:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname;
    if (!host) return false;
    return isValidIPv4(host) || isValidDomain(host) || isValidIPv6(host.replace(/^\[|\]$/g, ""));
  } catch {
    return false;
  }
}

/**
 * Validates Email format and domain TLD.
 */
export function isValidEmail(email: string): boolean {
  const atIdx = email.indexOf("@");
  if (atIdx <= 0) return false;
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  if (local.length > 64 || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  return isValidDomain(domain);
}

/**
 * Filters out false-positive hex strings (e.g., all zeros, repeated chars, low entropy).
 */
export function isValidHash(hex: string): { valid: boolean; subtype?: "MD5" | "SHA-1" | "SHA-256" | "SHA-512" } {
  if (!/^[a-fA-F0-9]+$/.test(hex)) return { valid: false };
  // Reject homogeneous repeated digits/letters like 000000... or ffffff...
  if (/^(.)\1+$/.test(hex)) return { valid: false };
  // Require at least 4 distinct hex characters to avoid dummy padding strings
  const uniqueChars = new Set(hex.toLowerCase()).size;
  if (uniqueChars < 4) return { valid: false };
  // Reject pure decimal digits for 32/40 char strings (likely numeric IDs/timestamps)
  if (/^\d+$/.test(hex)) return { valid: false };

  switch (hex.length) {
    case 32:
      return { valid: true, subtype: "MD5" };
    case 40:
      return { valid: true, subtype: "SHA-1" };
    case 64:
      return { valid: true, subtype: "SHA-256" };
    case 128:
      return { valid: true, subtype: "SHA-512" };
    default:
      return { valid: false };
  }
}

/**
 * Validates CVE identifier format (CVE-YYYY-NNNN+).
 */
export function isValidCVE(cve: string): boolean {
  const match = /^CVE-(\d{4})-(\d{4,7})$/i.exec(cve);
  if (!match) return false;
  const year = Number(match[1]);
  return year >= 1999 && year <= 2030;
}

/**
 * Validates Bitcoin (Base58 or Bech32) and Ethereum (0x + 40 hex) wallet addresses.
 */
export function validateWalletAddress(addr: string): { valid: boolean; subtype?: "Bitcoin" | "Ethereum" } {
  // Ethereum: 0x followed by 40 hex chars, mixed case or hex letters present
  if (/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    const hexPart = addr.slice(2);
    if (new Set(hexPart.toLowerCase()).size < 4) return { valid: false };
    return { valid: true, subtype: "Ethereum" };
  }

  // Bitcoin Bech32 (bc1...)
  if (/^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{25,59}$/i.test(addr)) {
    return { valid: true, subtype: "Bitcoin" };
  }

  // Bitcoin Legacy/P2SH (1... or 3..., 26-35 Base58 chars)
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr)) {
    // Reject plain English words or single-case strings that happen to start with 1 or 3
    const hasDigit = /\d/.test(addr.slice(1));
    const hasUpper = /[A-Z]/.test(addr.slice(1));
    const hasLower = /[a-z]/.test(addr.slice(1));
    if (hasDigit && (hasUpper || hasLower)) {
      return { valid: true, subtype: "Bitcoin" };
    }
  }

  return { valid: false };
}
