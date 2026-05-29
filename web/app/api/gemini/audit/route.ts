import { NextRequest, NextResponse } from "next/server";
import { aiJSON, type AIProvider } from "@/lib/ai-client";

const AUDIT_PROMPT = `You are a senior regulatory compliance auditor. Analyze the provided configuration, log, or policy document and return a structured JSON compliance audit report.

Return ONLY valid JSON — no markdown fences, no explanation, just the JSON object.

Schema:
{
  "status": "<COMPLIANT|PARTIAL|FAILED|CRITICAL_VIOLATION>",
  "score": <integer 0-100>,
  "summary": "<2-3 sentence plain-English summary of findings>",
  "findings": [
    {
      "id": "GAP-01",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW>",
      "control": "<regulatory control reference, e.g. GDPR Art 32, SOC2 CC6.1, ISO 27001 A.12.6>",
      "issue": "<specific violation found in the provided content>",
      "impact": "<business/legal impact if not remediated>",
      "remediation": "<specific actionable fix with commands or config changes if applicable>"
    }
  ],
  "verifiedAssets": ["<list of compliant items found in the content>"]
}

Scoring guide:
- 90-100: Fully compliant, minor observations only
- 70-89: Mostly compliant, some gaps
- 50-69: Significant gaps, remediation required
- 30-49: Major violations, urgent action needed
- 0-29: Critical violations, immediate risk

Be specific — reference exact lines, values, or settings from the provided content.`;

export async function POST(req: NextRequest) {
  try {
    const { content, standard, context, provider } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const userPrompt = `Compliance Standard(s): ${standard || "General Security Best Practices"}
${context ? `Context: ${context}\n` : ""}
--- CONTENT TO AUDIT ---
${content}
--- END CONTENT ---

Analyze the above content against the specified compliance standard(s) and return the JSON audit report.`;

    const { data, provider: usedProvider } = await aiJSON(
      AUDIT_PROMPT,
      userPrompt,
      provider as AIProvider | undefined,
    );

    return NextResponse.json({ ...(data as object), provider: usedProvider });
  } catch (err: unknown) {
    console.error("AI audit error:", err);
    return NextResponse.json(
      { isMock: true, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 200 },
    );
  }
}
