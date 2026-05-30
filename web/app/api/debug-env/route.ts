import { NextResponse } from "next/server";

// Temporary debug endpoint — remove after confirming env vars are set
export async function GET() {
  return NextResponse.json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    geminiKeyPrefix: process.env.GEMINI_API_KEY?.slice(0, 6) ?? "NOT SET",
    hasAIMLKey: !!process.env.AIMLAPI_KEY,
    geminiModel: process.env.GEMINI_MODEL ?? "NOT SET",
  });
}
