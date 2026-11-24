import { AIInsightsResult, ExtractedIOC } from "../../types/ioc";

export interface AIStatusResponse {
  configured: boolean;
  model: string;
}

export async function fetchAIStatus(): Promise<AIStatusResponse> {
  const res = await fetch("/api/ai/status");
  if (!res.ok) {
    return { configured: false, model: "gemini-4-hydrogen" };
  }
  return (await res.json()) as AIStatusResponse;
}

export async function generateAIInsights(params: {
  reportText: string;
  extractedIOCs: ExtractedIOC[];
  reportTitle?: string;
}): Promise<AIInsightsResult> {
  const res = await fetch("/api/ai/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportText: params.reportText,
      reportTitle: params.reportTitle,
      extractedIOCs: params.extractedIOCs
        .filter((i) => !i.isFalsePositive)
        .map((i) => ({
          value: i.value,
          type: i.type,
          subtype: i.subtype,
          confidence: i.confidence,
          occurrences: i.occurrences,
        })),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `AI request failed with status ${res.status}`);
  }
  return data as AIInsightsResult;
}
