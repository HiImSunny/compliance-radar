/**
 * Unified AI client — tries Gemini first, falls back to AIML API.
 * Both providers are OpenAI-compatible for chat completions.
 * AIML API base: https://api.aimlapi.com/v1
 */

export type AIProvider = "gemini" | "aimlapi";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  text: string;
  provider: AIProvider;
}

// ── AIML API (OpenAI-compatible) ─────────────────────────────

const AIMLAPI_BASE_URL = process.env.AIMLAPI_BASE_URL ?? "https://api.aimlapi.com/v1";
const AIMLAPI_DEFAULT_MODEL = process.env.AIMLAPI_MODEL ?? "gpt-4o";
const GEMINI_DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

async function callAIMLAPI(messages: ChatMessage[], model = AIMLAPI_DEFAULT_MODEL): Promise<string> {
  const apiKey = process.env.AIMLAPI_KEY;
  if (!apiKey) throw new Error("AIMLAPI_KEY not set");

  const res = await fetch(`${AIMLAPI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AIML API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Gemini (via @google/generative-ai) ───────────────────────

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  model = GEMINI_DEFAULT_MODEL,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model, systemInstruction: systemPrompt });
  const result = await geminiModel.generateContent(userPrompt);
  return result.response.text();
}

// ── Unified call with auto-fallback ──────────────────────────

export async function aiChat(
  systemPrompt: string,
  userPrompt: string,
  preferredProvider?: AIProvider,
): Promise<AIResponse> {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasAIML = !!process.env.AIMLAPI_KEY;

  // Determine order: preferred first, then fallback
  const order: AIProvider[] =
    preferredProvider === "aimlapi"
      ? ["aimlapi", "gemini"]
      : ["gemini", "aimlapi"];

  const errors: string[] = [];

  for (const provider of order) {
    if (provider === "gemini" && !hasGemini) continue;
    if (provider === "aimlapi" && !hasAIML) continue;

    try {
      if (provider === "gemini") {
        const text = await callGemini(systemPrompt, userPrompt);
        return { text, provider: "gemini" };
      } else {
        const messages: ChatMessage[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ];
        const text = await callAIMLAPI(messages);
        return { text, provider: "aimlapi" };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider}: ${msg}`);
      console.warn(`[ai-client] ${provider} failed, trying next provider. Error: ${msg}`);
    }
  }

  throw new Error(`All AI providers failed. ${errors.join(" | ")}`);
}

// ── JSON-mode call (for audit) ────────────────────────────────

export async function aiJSON(
  systemPrompt: string,
  userPrompt: string,
  preferredProvider?: AIProvider,
): Promise<{ data: unknown; provider: AIProvider }> {
  const { text, provider } = await aiChat(systemPrompt, userPrompt, preferredProvider);

  // Strip markdown fences
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();

  const data = JSON.parse(cleaned);
  return { data, provider };
}
