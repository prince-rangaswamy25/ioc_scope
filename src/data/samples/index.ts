import { SampleReport } from "../../types/ioc";

export const SAMPLE_REPORTS: SampleReport[] = [
  {
    id: "sample-phishing",
    title: "SOC-2026-4108: Executive Spear-Phishing & AitM Credential Harvesting",
    category: "Phishing Campaign",
    severity: "High",
    date: "2026-11-18T09:42:00Z",
    summary:
      "Targeted adversary-in-the-middle (AitM) phishing wave spoofing SSO portals via defanged URLs, malicious macro attachments, and lookalike sender domains.",
    text: `INCIDENT TICKET: SOC-2026-4108 | PRIORITY: HIGH
Analyst: M. Vance | Date: 2026-11-18 09:42 UTC

1. EXECUTIVE SUMMARY
Multiple finance executives received spoofed MFA reset emails originating from security-noreply[at]okta-sso-verify[.]com (relayed via 185[.]220[.]101[.]42 and 91.214.124.88). Recipients were directed to an Adversary-in-the-Middle (AitM) reverse proxy hosted at hxxps://login-portal[.]okta-sso-verify[.]com/auth/v2/session?tenant=fin-corp.

2. ARTIFACTS & ENDPOINT TELEMETRY
- 2026-11-18 08:14 UTC: Inbound email delivered with attachment Q4_Payroll_Audit_2026.docm (SHA-256: 4a7d1ed414474e4033ac29ccb8653d9b4a7d1ed414474e4033ac29ccb8653d9b).
- 2026-11-18 08:19 UTC: Macro spawned powershell.exe fetching stage-2 dropper from hxxps://cdn-assets[.]cloudsync-edge[.]net/update/agent_x64.ps1.
- 2026-11-18 08:21 UTC: Payload written to C:\\Users\\j.miller\\AppData\\Local\\Temp\\win_telemetry_svc.exe (MD5: d41d8cd98f00b204e9800998ecf8427e).
- 2026-11-18 08:22 UTC: Persistence key created at HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\WinTelemetrySvc.

3. VULNERABILITY & INFRASTRUCTURE NOTES
Triage identified attempts to abuse CVE-2024-21413 within Outlook preview handlers. Secondary fallback domain auth-cdn-mirror[.]xyz resolved to 45.155.205.91. Internal proxy gateway 10.24.18.55 blocked outbound port 8443 traffic after automated EDR containment. Legitimate reference traffic to login.microsoft.com was verified benign.`,
  },
  {
    id: "sample-ransomware",
    title: "IR-2026-8821: LockVortex Ransomware Lateral Movement & Encryption",
    category: "Ransomware Outbreak",
    severity: "Critical",
    date: "2026-11-20T03:15:00Z",
    summary:
      "Multi-host ransomware deployment leveraging an unpatched VPN appliance vulnerability, scheduled task persistence, shadow copy deletion, and BTC/ETH extortion demands.",
    text: `CRITICAL INCIDENT REPORT: IR-2026-8821
Severity: CRITICAL | Status: Active Containment | Detected: 2026-11-20 03:15 UTC

TIMELINE OF OBSERVED ACTIVITY:
- 2026-11-20 01:08 UTC: Threat actor exploited CVE-2024-3400 on edge firewall (external source IP 194.26.135.202 and 2a01:4f8:c010:9a21::4).
- 2026-11-20 01:34 UTC: Webshell dropped to /var/www/html/static/healthcheck_api.py and lateral scanner executed from /tmp/.sys_audit_bin.
- 2026-11-20 02:11 UTC: Domain controller DC-02 observed PsExec deployment of C:\\ProgramData\\LockVortex\\vortex_crypt.exe (SHA-256: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08).
- 2026-11-20 02:19 UTC: Registry tampering detected on HKLM\\SYSTEM\\CurrentControlSet\\Services\\vss\\Start and HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\DisableAntiSpyware.
- 2026-11-20 02:45 UTC: Auxiliary loader vss_nuke.bat executed prior to mass file encryption (.vortex extension).

EXTORTION & NEGOTIATION INDICATORS:
Ransom note README_RESTORE.txt instructs operators to contact recovery-desk[at]onionmail[.]org or visit hxxp://vortex7x3k9m2p[.]onion/claim.
Payment wallets listed in ransom note:
- Bitcoin: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
- Ethereum: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F

Affected subnet: 192.168.40.0/24 (internal VLAN quarantined).`,
  },
  {
    id: "sample-c2",
    title: "TH-2026-1194: Persistent Cobalt Strike HTTPS C2 Beaconing",
    category: "C2 Beaconing",
    severity: "High",
    date: "2026-11-21T14:50:00Z",
    summary:
      "Periodic 60-second HTTPS jittered beacons to rotating cloud CDN endpoints with DLL sideloading and memory-resident shellcode.",
    text: `THREAT HUNTING ADVISORY: TH-2026-1194
Date: 2026-11-21 14:50 UTC | Scope: Engineering Workstations

BEHAVIORAL FINDINGS:
1. Endpoint ENG-WS-044 exhibited regular 60s HTTPS beacons (15% jitter) to 104.244.76.19 and fallback C2 179[.]43[.]154[.]200 over TCP/443.
2. DNS logs recorded high-entropy TXT queries to telemetry-sync[.]dev-metrics[.]io and static[.]updates-cdn[.]top.
3. Process tree inspection revealed legitimate signed binary sideloading C:\\Windows\\Temp\\version_proxy.dll (SHA-1: 356a192b7913b04c54574d18c28d46e6395428ab).
4. Beacon configuration extracted from memory pointed to:
   - Primary URI: hxxps://telemetry-sync[.]dev-metrics[.]io/api/v1/jquery-3.6.0.min.js
   - Backup URI: hxxps://static[.]updates-cdn[.]top/assets/pixel.gif
   - Staging Hash (SHA-256): e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

RECOMMENDED BLOCKS:
Add egress block rules for 104.244.76.19/32 and 179.43.154.0/24. Inspect all hosts for C:\\Users\\Public\\Libraries\\msedge_sync.dll and registry run key HKCU\\Software\\Classes\\CLSID\\{645FF040-5081-101B-9F08-00AA002F954E}\\InprocServer32.`,
  },
  {
    id: "sample-exfil",
    title: "DLP-2026-5502: Staged Rclone Data Exfiltration via Compromised Service Account",
    category: "Data Exfiltration",
    severity: "Critical",
    date: "2026-11-22T21:10:00Z",
    summary:
      "Unauthorized archive staging and multi-gigabyte egress via rclone to external object storage controlled by an attacker-provisioned endpoint.",
    text: `DATA LOSS PREVENTION ESCALATION: DLP-2026-5502
Timestamp: 2026-11-22 21:10 UTC | Escalated by: SIEM Correlation Rule #409

OBSERVED SEQUENCE:
- 2026-11-22 19:05 UTC: Service account svc_backup authenticated from anomalous VPN exit 198.98.51.189 (CVE-2023-46805 suspected bypass).
- 2026-11-22 19:22 UTC: Staging archive created at /var/tmp/db_dump_nov2026.tar.gz and auxiliary script /opt/scripts/sync_stage.sh.
- 2026-11-22 19:40 UTC: Operator transferred 18.4 GB over HTTPS to hxxps://s3-eu-west[.]object-vault[.]cc/buckets/staging-891/ via rclone_custom.exe (MD5: 098f6bcd4621d373cade4e832627b4f6).
- 2026-11-22 20:03 UTC: Secondary exfiltration notifications emailed to dropbox-alerts[@]proton-relay[.]org.
- 2026-11-22 20:15 UTC: Attackers queried external IP 209.141.58.146 and domain sync-api[.]cloud-mirror[.]org for credential verification.

Note: Internal database host 10.10.5.12 was isolated at 20:45 UTC. References to github.com in deployment docs were confirmed benign.`,
  },
];
