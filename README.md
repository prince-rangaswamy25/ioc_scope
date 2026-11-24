# IOCScope — Automated Indicator Extraction from Incident Reports

> **Tagline:** From messy incident text to actionable threat intelligence in seconds.

IOCScope is a multi-page Security Operations Center (SOC) triage workspace that extracts, validates, refangs, scores, and exports Indicators of Compromise (IOCs) from unstructured incident reports, phishing emails, threat advisories, PDFs, and Word documents.

## Key Features

- **Deterministic Client-Side Extraction Engine**: Extracts 9 indicator categories locally in the browser (`IPv4/IPv6/CIDR`, `Domains`, `URLs`, `Emails`, `MD5/SHA-1/SHA-256/SHA-512 Hashes`, `CVE IDs`, `Windows/Unix File Paths & Suspicious Artifacts`, `Windows Registry Keys`, and `Bitcoin/Ethereum Wallets`).
- **Defang / Refang Normalization**: Automatically detects and normalizes obfuscated indicators (`hxxp`, `hxxps`, `[.]`, `(.)`, `{.}`, `[dot]`, `[at]`, `(at)`, `[://]`) while retaining source offsets for inline highlighting.
- **Document Parsing**: Drag-and-drop ingestion for `.txt`, `.log`, `.eml`, `.csv`, `.pdf` (`pdfjs-dist`), and `.docx` (`mammoth`) directly in the browser.
- **Analyst Triage Workspace**: Searchable, sortable, filterable IOC table, confidence scoring (`High`/`Medium`/`Low`), context snippets, false-positive toggles, and an XSS-safe inline highlighted report view with hover tooltips.
- **Grounded AI Insights (Gemini)**: Optional server-side `/api/ai/insights` endpoint powered by `@google/genai` (`gemini-4-hydrogen`) generating executive summaries, threat classification, probable attack stage, MITRE ATT&CK technique mappings, containment steps, and timelines—strictly constrained to cite only indicators verified in the report.
- **SOC Analytics & Case History**: `localStorage`-persisted history with Recharts visualizations (IOC distribution donut, extraction volume over time, top recurring indicators, risk score trend), bulk export, and side-by-side report comparison.
- **Standards-Compliant Exports**: Download STIX 2.1 JSON bundles, structured JSON, CSV, plain text lists, or printable PDF reports.
- **Single-IOC Lookup & Batch Defang/Refang**: Auto-detect single IOCs and open contextual OSINT links (VirusTotal, AbuseIPDB, Shodan, URLScan.io, NVD/MITRE, Blockchain explorers).

## Folder Structure

```
/
├── server.ts                      # Express server + Vite middleware + /api/ai/insights
├── src/
│   ├── components/                # Layout, IOCBadge, RiskScoreGauge, HighlightedReportView, Toasts
│   ├── context/                   # AppContext (theme, settings, workspace, localStorage history)
│   ├── data/samples/              # 4 realistic fictional incident reports with defanged IOCs
│   ├── lib/
│   │   ├── defang/                # Refang/defang normalization utilities
│   │   ├── validators/            # Octet, CIDR, IPv6, IANA TLD, hash entropy, wallet validators
│   │   ├── extractor/             # Deterministic regex + chunked async engine & unit test suite
│   │   ├── parsers/               # Local .txt, .pdf, .docx text extraction
│   │   └── export/                # JSON, CSV, Plain Text, and STIX 2.1 bundle formatters
│   ├── pages/                     # 10 routes: Landing, Analyzer, Insights, Dashboard, History, Lookup, Methodology, About, Settings, 404
│   └── services/ai/               # Frontend API client for /api/ai/*
```

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (see `.env.example`):
   - `GEMINI_API_KEY`: Optional server-side key enabling the `/insights` Gemini threat assessment page.
3. Start development server on port `3000`:
   ```bash
   npm run dev
   ```
4. Build for production and start:
   ```bash
   npm run build
   npm start
   ```

## Security & Privacy Model

- **Local-First Processing**: All regex extraction, file parsing, defang normalization, and STIX export run 100% client-side.
- **No Auto-Fetching**: Extracted URLs and domains are never fetched, resolved, or opened automatically.
- **XSS-Safe Rendering**: Report text and inline highlights are rendered strictly as React text nodes without raw HTML injection.
- **Server-Side AI Key**: `GEMINI_API_KEY` is read exclusively by Express on the server and never exposed to client bundles.

## Limitations & Future Scope

- **Current Limitations**: Image-only scanned PDFs without embedded text require external OCR; bare two-label strings colliding with script extensions (`.py`, `.sh`, `.zip`) are classified as file artifacts rather than domains.
- **Future Roadmap**: Browser extension for one-click web advisory triage, direct SIEM/SOAR webhook connectors, STIX/TAXII 2.1 polling feeds, and multi-language OCR document ingestion.
