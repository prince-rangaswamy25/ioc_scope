import { extractIOCs } from "./index";
import { refangIndicator, defangIndicator } from "../defang";
import { isValidIPv4, isValidHash, isPrivateOrReservedIPv4 } from "../validators";

export interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

/**
 * Deterministic unit test suite for IOCScope's extraction, defanging, and validation engines.
 * Executable directly in the browser on the Methodology page or in test runners.
 */
export function runExtractorTestSuite(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  // Test 1: Defanged URL & IPv4 extraction
  {
    const sample =
      "Malware callback observed to hxxps://cdn-update[.]evil-telemetry[.]io/stage2.bin via 185[.]220[.]101[.]42 and 185[dot]220[dot]101[dot]42.";
    const res = extractIOCs(sample);
    const hasUrl = res.iocs.some(
      (i) => i.type === "url" && i.value === "https://cdn-update.evil-telemetry.io/stage2.bin" && i.isDefanged
    );
    const ipEntry = res.iocs.find((i) => i.type === "ip" && i.value === "185.220.101.42");
    const passed = hasUrl && Boolean(ipEntry) && ipEntry!.occurrences === 2;
    results.push({
      id: "T-01",
      name: "Defanged URL & IPv4 Normalization + Deduplication",
      passed,
      details: passed
        ? "Refanged hxxps/[.]/[dot] and deduplicated 185.220.101.42 (occurrences=2)."
        : `Unexpected output: ${JSON.stringify(res.iocs.map((i) => [i.type, i.value, i.occurrences]))}`,
    });
  }

  // Test 2: Invalid IPv4 octet rejection
  {
    const sample = "Broken log line 999.12.45.1 and valid C2 45.155.205.91.";
    const res = extractIOCs(sample);
    const ips = res.iocs.filter((i) => i.type === "ip").map((i) => i.value);
    const passed = !isValidIPv4("999.12.45.1") && ips.length === 1 && ips[0] === "45.155.205.91";
    results.push({
      id: "T-02",
      name: "Strict IPv4 Octet Bounds Rejection (999.x.x.x)",
      passed,
      details: passed
        ? "Rejected 999.12.45.1 while capturing valid 45.155.205.91."
        : `Captured IPs: ${ips.join(", ")}`,
    });
  }

  // Test 3: Private IP filtering toggle
  {
    const sample = "Internal pivot from 10.24.18.55 and 192.168.1.40 to external C2 91.214.124.88.";
    const filtered = extractIOCs(sample, { filterPrivateIPs: true });
    const unfiltered = extractIOCs(sample, { filterPrivateIPs: false });
    const passed =
      isPrivateOrReservedIPv4("10.24.18.55") &&
      filtered.iocs.filter((i) => i.type === "ip").length === 1 &&
      unfiltered.iocs.filter((i) => i.type === "ip").length === 3;
    results.push({
      id: "T-03",
      name: "RFC1918 Private IP Filtering Toggle",
      passed,
      details: passed
        ? "Filtered 10.x and 192.168.x when enabled; retained all 3 when disabled."
        : `Filtered=${filtered.iocs.length}, Unfiltered=${unfiltered.iocs.length}`,
    });
  }

  // Test 4: Hashes & low-entropy hex false-positive exclusion
  {
    const validSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const dummyZeros = "00000000000000000000000000000000";
    const sample = `Payload SHA-256 hash: ${validSha256}. Padding: ${dummyZeros}.`;
    const res = extractIOCs(sample);
    const hashes = res.iocs.filter((i) => i.type === "hash");
    const passed =
      !isValidHash(dummyZeros).valid &&
      hashes.length === 1 &&
      hashes[0].value === validSha256 &&
      hashes[0].confidence === "High";
    results.push({
      id: "T-04",
      name: "SHA-256 Extraction & Low-Entropy Hex Rejection",
      passed,
      details: passed
        ? "Matched SHA-256 with High confidence and rejected 32-zero padding."
        : `Hashes found: ${JSON.stringify(hashes)}`,
    });
  }

  // Test 5: Email defang & benign domain filtering
  {
    const sample =
      "Phishing sender spoofed security-alert[at]okta-verify-login[.]com; reply-to support@microsoft.com.";
    const res = extractIOCs(sample, { filterBenignDomains: true });
    const emails = res.iocs.filter((i) => i.type === "email");
    const passed =
      emails.length === 1 &&
      emails[0].value === "security-alert@okta-verify-login.com" &&
      emails[0].isDefanged;
    results.push({
      id: "T-05",
      name: "Defanged Email Normalization & Benign Allowlist Filtering",
      passed,
      details: passed
        ? "Normalized [at]/[.] phishing email and filtered benign microsoft.com."
        : `Emails found: ${JSON.stringify(emails.map((e) => e.value))}`,
    });
  }

  // Test 6: CVEs, Windows paths, Registry keys, and Crypto Wallets
  {
    const sample = [
      "Exploited CVE-2024-21413 to drop C:\\Users\\Public\\svchost_updater.exe.",
      "Persistence added at HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\SysSync.",
      "Ransom note demanded BTC to bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh.",
    ].join(" ");
    const res = extractIOCs(sample);
    const hasCve = res.iocs.some((i) => i.type === "cve" && i.value === "CVE-2024-21413");
    const hasPath = res.iocs.some(
      (i) => i.type === "filepath" && i.value.includes("svchost_updater.exe")
    );
    const hasReg = res.iocs.some(
      (i) => i.type === "registry" && i.value.startsWith("HKCU\\Software\\Microsoft")
    );
    const hasWallet = res.iocs.some(
      (i) => i.type === "wallet" && i.value === "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
    );
    const passed = hasCve && hasPath && hasReg && hasWallet;
    results.push({
      id: "T-06",
      name: "Multi-Artifact Extraction (CVE, Windows Path, Registry, BTC Wallet)",
      passed,
      details: passed
        ? "Accurately extracted CVE, Windows path, HKCU registry key, and Bech32 BTC wallet."
        : `Flags: cve=${hasCve}, path=${hasPath}, reg=${hasReg}, wallet=${hasWallet}`,
    });
  }

  // Test 7: Bidirectional Defang/Refang Roundtrip
  {
    const original = "https://portal.auth-reset.net/login";
    const defanged = defangIndicator(original);
    const { refanged, wasDefanged } = refangIndicator(defanged);
    const passed =
      defanged === "hxxps://portal[.]auth-reset[.]net/login" &&
      refanged === original &&
      wasDefanged;
    results.push({
      id: "T-07",
      name: "Defang / Refang Bidirectional Roundtrip",
      passed,
      details: passed
        ? "Defanged to hxxps://portal[.]auth-reset[.]net/login and refanged cleanly."
        : `Defanged=${defanged}, Refanged=${refanged}`,
    });
  }

  return results;
}
