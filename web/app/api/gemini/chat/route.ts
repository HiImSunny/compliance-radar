import { NextRequest, NextResponse } from "next/server";
import { aiChat, type AIProvider } from "@/lib/ai-client";

const SYSTEM_PROMPT = `You are an AI compliance analyst embedded in ComplianceRadar, a regulatory monitoring dashboard.

Your job is to help compliance officers and legal teams understand regulatory alerts, assess risk, and decide what actions to take within their organization.

Guidelines:
- Answer in plain, professional language — no shell commands, no code snippets, no terminal syntax
- Focus on: what the regulation means, which teams are affected, what business actions to take, deadlines, and risk level
- Reference specific regulatory frameworks when relevant: GDPR, SOC2, ISO 27001, HIPAA, FINRA, SEC, OSHA, FTC
- Keep answers concise and actionable — bullet points and numbered steps are fine
- When analyzing an alert, structure your response as: (1) what happened, (2) who is affected, (3) what to do, (4) timeline
- Do not suggest IT commands, scripts, or technical infrastructure changes — focus on compliance process and business response

Tone: Clear, direct, professional. Like a senior compliance consultant briefing a team.`;

export async function POST(req: NextRequest) {
  try {
    const { message, context, provider } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const fullPrompt = context
      ? `[LIVE SYSTEM CONTEXT]\n${context}\n\n[OPERATOR QUERY]\n${message}`
      : message;

    const result = await aiChat(SYSTEM_PROMPT, fullPrompt, provider as AIProvider | undefined);

    return NextResponse.json({ text: result.text, provider: result.provider });
  } catch (err: unknown) {
    console.error("AI chat error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ isMock: true, error: msg }, { status: 200 });
  }
}
