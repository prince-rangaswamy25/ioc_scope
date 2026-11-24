import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface InsightsRequestBody {
  reportText?: string;
  extractedIOCs?: Array<{
    value: string;
    type: string;
    subtype?: string;
    confidence: string;
    occurrences: number;
  }>;
  reportTitle?: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/ai/status", (_req, res) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const configured = Boolean(apiKey && apiKey !== "MY_GEMINI_API_KEY");
    res.json({
      configured,
      model: "gemini-4-hydrogen",
    });
  });

  app.post("/api/ai/insights", async (req, res) => {
    try {
      const body = req.body as InsightsRequestBody;
      const reportText = (body?.reportText ?? "").trim();
      const extractedIOCs = Array.isArray(body?.extractedIOCs) ? body.extractedIOCs : [];

      if (!reportText) {
        res.status(400).json({ error: "Incident report text is required for AI enrichment." });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: "Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.",
        });
        return;
      }

      const clippedReport = reportText.slice(0, 32000);
      const allowedValues = extractedIOCs.map((i) => `${i.type.toUpperCase()}: ${i.value}`);

      const systemInstruction = [
        "You are a senior Tier-3 SOC threat intelligence analyst.",
        "Analyze the provided incident report and the deterministically extracted IOCs.",
        "CRITICAL GROUNDING RULE: You MUST ONLY reference indicators (IPs, domains, URLs, emails, hashes, CVEs, file paths, registry keys, wallets) that are explicitly present in the provided report text or extracted IOC list.",
        "NEVER invent, extrapolate, or fabricate any IOCs, CVE IDs, hashes, or IP addresses not found in the source text.",
        "If no dates or timestamps are present in the report, return an empty timeline array.",
        "Keep every section concise, technical, and directly actionable for incident response.",
      ].join(" ");

      const prompt = [
        `Report Title: ${body.reportTitle || "Untitled Incident Report"}`,
        "",
        "Deterministically Extracted IOCs (Ground Truth):",
        allowedValues.length > 0 ? allowedValues.join("\n") : "(No IOCs matched deterministic patterns)",
        "",
        "Incident Report Text:",
        clippedReport,
      ].join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: {
                type: Type.STRING,
                description: "2-4 sentence executive summary referencing only verified facts and indicators from the report.",
              },
              threatType: {
                type: Type.STRING,
                description: "Primary threat classification (e.g., Phishing Campaign, Ransomware Outbreak, C2 Beaconing, Data Exfiltration, Credential Harvesting).",
              },
              severityAssessment: {
                type: Type.STRING,
                description: "One of: Critical, High, Medium, Low.",
              },
              probableAttackStage: {
                type: Type.STRING,
                description: "Likely cyber kill chain / attack lifecycle stage (e.g., Initial Access, Execution, Persistence, Command & Control, Exfiltration, Impact).",
              },
              referencedIOCs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Subset of the exact IOC values from the provided list that are key to this incident.",
              },
              mitreTechniques: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "MITRE ATT&CK technique ID, e.g., T1566.001" },
                    name: { type: Type.STRING, description: "MITRE ATT&CK technique name" },
                    tactic: { type: Type.STRING, description: "Associated MITRE ATT&CK tactic" },
                    reason: { type: Type.STRING, description: "Evidence from the report text justifying this mapping" },
                  },
                  required: ["id", "name", "tactic", "reason"],
                },
              },
              containmentSteps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    priority: { type: Type.STRING, description: "Immediate, Short-Term, or Follow-Up" },
                    action: { type: Type.STRING, description: "Concrete SOC containment or eradication action" },
                    targetIndicator: { type: Type.STRING, description: "Specific IOC from the report if applicable, or General" },
                  },
                  required: ["priority", "action", "targetIndicator"],
                },
              },
              timeline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timestamp: { type: Type.STRING, description: "Exact date/time string found in the report" },
                    event: { type: Type.STRING, description: "What occurred at this timestamp based on the report" },
                  },
                  required: ["timestamp", "event"],
                },
                description: "Chronological timeline only if explicit dates/timestamps appear in the report; otherwise empty array.",
              },
            },
            required: [
              "executiveSummary",
              "threatType",
              "severityAssessment",
              "probableAttackStage",
              "referencedIOCs",
              "mitreTechniques",
              "containmentSteps",
              "timeline",
            ],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);

      // Grounding filter: ensure referencedIOCs only includes indicators actually present in the report or extracted list
      const lowerReport = reportText.toLowerCase();
      const extractedSet = new Set(extractedIOCs.map((i) => i.value.toLowerCase()));
      if (Array.isArray(parsed.referencedIOCs)) {
        parsed.referencedIOCs = parsed.referencedIOCs.filter((ioc: string) => {
          const norm = String(ioc).toLowerCase();
          return extractedSet.has(norm) || lowerReport.includes(norm);
        });
      }

      res.json({
        ...parsed,
        generatedAt: new Date().toISOString(),
        model: "gemini-4-hydrogen",
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown AI enrichment failure";
      const statusCode =
        errMsg.includes("API_KEY_INVALID") || errMsg.includes("PERMISSION_DENIED")
          ? 403
          : errMsg.includes("RESOURCE_EXHAUSTED")
            ? 429
            : 500;
      res.status(statusCode).json({ error: errMsg });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => {
      const indexFile = path.join(distPath, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("Application build not found. Run npm run build first.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IOCScope server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
