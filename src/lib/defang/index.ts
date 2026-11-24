/**
 * Utilities for normalizing defanged (obfuscated) indicators and safely
 * defanging active indicators for analyst reports.
 */

export interface RefangResult {
  refanged: string;
  wasDefanged: boolean;
}

const DEFANG_PATTERNS: Array<{ regex: RegExp; replace: string }> = [
  // Protocol obfuscations
  { regex: /\bhxxps(?=\s*[:\[])/gi, replace: "https" },
  { regex: /\bhxxp(?=\s*[:\[])/gi, replace: "http" },
  { regex: /\bfxp(?=\s*[:\[])/gi, replace: "ftp" },
  { regex: /\[:\/\/\]/g, replace: "://" },
  { regex: /\(:\/\/\)/g, replace: "://" },
  { regex: /\{:\/\/\}/g, replace: "://" },
  { regex: /\[:\]\/\//g, replace: "://" },
  { regex: /\(:\)\/\//g, replace: "://" },
  { regex: /\[:\]/g, replace: ":" },
  // Dot obfuscations
  { regex: /\[\.\]/g, replace: "." },
  { regex: /\(\.\)/g, replace: "." },
  { regex: /\{\.\}/g, replace: "." },
  { regex: /\\?\s*\[\s*dot\s*\]\s*/gi, replace: "." },
  { regex: /\\?\s*\(\s*dot\s*\)\s*/gi, replace: "." },
  { regex: /\\?\s*\{\s*dot\s*\}\s*/gi, replace: "." },
  // At-sign obfuscations
  { regex: /\s*\[\s*@\s*\]\s*/g, replace: "@" },
  { regex: /\s*\(\s*@\s*\)\s*/g, replace: "@" },
  { regex: /\s*\[\s*at\s*\]\s*/gi, replace: "@" },
  { regex: /\s*\(\s*at\s*\)\s*/gi, replace: "@" },
  { regex: /\s*\{\s*at\s*\}\s*/gi, replace: "@" },
  // Slash obfuscations
  { regex: /\[\s*\/\s*\]/g, replace: "/" },
];

/**
 * Refang an individual indicator string and track whether any obfuscation was removed.
 */
export function refangIndicator(input: string): RefangResult {
  let current = input.trim();
  let wasDefanged = false;

  for (const { regex, replace } of DEFANG_PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(current)) {
      wasDefanged = true;
      regex.lastIndex = 0;
      current = current.replace(regex, replace);
    }
  }

  return {
    refanged: current,
    wasDefanged,
  };
}

/**
 * Refang an entire block of incident report text while preserving layout as closely as possible.
 */
export function refangText(text: string): string {
  let output = text;
  for (const { regex, replace } of DEFANG_PATTERNS) {
    regex.lastIndex = 0;
    output = output.replace(regex, replace);
  }
  return output;
}

/**
 * Defang a live indicator so it cannot accidentally resolve or become clickable in reports/tickets.
 */
export function defangIndicator(value: string): string {
  let out = value.trim();
  out = out.replace(/^https:\/\//i, "hxxps://");
  out = out.replace(/^http:\/\//i, "hxxp://");
  out = out.replace(/^ftp:\/\//i, "fxp://");
  out = out.replace(/@/g, "[@]");
  out = out.replace(/\./g, "[.]");
  return out;
}

/**
 * Check if a raw string contains any common defang markers.
 */
export function hasDefangMarkers(raw: string): boolean {
  return DEFANG_PATTERNS.some(({ regex }) => {
    regex.lastIndex = 0;
    return regex.test(raw);
  });
}
