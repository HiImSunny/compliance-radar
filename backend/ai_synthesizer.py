"""AI Synthesizer — uses Gemini 2.5 Flash to analyze regulatory changes."""
from __future__ import annotations

import json
import logging
import re

from google import genai
from config import settings

logger = logging.getLogger(__name__)

PROMPT_TEMPLATE = """You are a senior regulatory compliance expert. Analyze the following regulatory content and generate a structured compliance alert.

Source Name: {source_name}
Source URL: {url}
Previous Content Hash: {old_hash}

--- REGULATORY CONTENT ---
{new_content}
--- END CONTENT ---

Return ONLY a valid JSON object with NO markdown fences, NO explanation, just the JSON:
{{
  "severity": "<critical|high|medium|low>",
  "summary": "<2-3 sentence plain-English summary: what changed, why it matters, key deadline if any>",
  "impacted_depts": "<comma-separated departments, e.g.: Legal, Finance, HR, IT, Operations>",
  "remediation_steps": "<numbered action list as a single string, e.g.: 1. Review requirements\\n2. Update policies\\n3. Train staff>"
}}

Severity guide:
- critical: Immediate legal/financial risk, enforcement action possible, deadline ≤ 30 days
- high: Significant compliance gap, potential penalties, deadline ≤ 90 days
- medium: Policy updates needed, 90-180 day window, moderate business impact
- low: Informational, no immediate action required"""


class AISynthesizer:
    def __init__(self) -> None:
        if settings.gemini_api_key:
            self._client = genai.Client(api_key=settings.gemini_api_key)
        else:
            self._client = None
            logger.warning("GEMINI_API_KEY not set — AI synthesis will use fallback responses")

    async def synthesize(
        self,
        source_name: str,
        url: str,
        new_content: str,
        old_hash: str = "",
    ) -> dict:
        """Return {severity, summary, impacted_depts, remediation_steps}."""
        if not self._client:
            return self._fallback(source_name)

        prompt = PROMPT_TEMPLATE.format(
            source_name=source_name,
            url=url,
            new_content=new_content[:6000],  # cap context size
            old_hash=old_hash or "first scan — no previous hash",
        )

        try:
            response = await self._client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
            )
            text = response.text.strip()
            # Strip markdown code fences if the model adds them despite instructions
            text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
            text = re.sub(r"```\s*$", "", text, flags=re.MULTILINE)
            result = json.loads(text.strip())
            return {
                "severity": result.get("severity", "medium"),
                "summary": result.get("summary", f"{source_name} content updated — review required."),
                "impacted_depts": result.get("impacted_depts", "Legal, Compliance"),
                "remediation_steps": result.get(
                    "remediation_steps",
                    "1. Review the change\n2. Update policies\n3. Notify affected teams",
                ),
            }
        except json.JSONDecodeError:
            logger.warning("Gemini returned non-JSON; attempting partial extraction")
            return self._extract_from_text(getattr(response, "text", ""), source_name)
        except Exception as exc:
            logger.error(f"Gemini synthesis error for {source_name}: {exc}")
            return self._fallback(source_name)

    # ------------------------------------------------------------------
    def _fallback(self, source_name: str) -> dict:
        return {
            "severity": "medium",
            "summary": (
                f"Regulatory content from {source_name} has changed. "
                "Automated analysis unavailable — manual review required."
            ),
            "impacted_depts": "Legal, Compliance",
            "remediation_steps": (
                "1. Open the regulatory source URL\n"
                "2. Review the updated content\n"
                "3. Assess impact on current policies\n"
                "4. Update internal documentation\n"
                "5. Notify relevant department heads"
            ),
        }

    def _extract_from_text(self, text: str, source_name: str) -> dict:
        text_lower = text.lower()
        if "critical" in text_lower:
            severity = "critical"
        elif "high" in text_lower:
            severity = "high"
        elif "low" in text_lower:
            severity = "low"
        else:
            severity = "medium"
        return {
            "severity": severity,
            "summary": (
                f"Regulatory update detected at {source_name}. "
                "AI analysis partially complete — manual review recommended."
            ),
            "impacted_depts": "Legal, Compliance",
            "remediation_steps": "1. Review the regulatory source\n2. Assess compliance impact\n3. Update policies as needed",
        }
