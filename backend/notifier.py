"""Slack Notifier — posts formatted compliance alerts to a Slack webhook."""
from __future__ import annotations

import logging
import httpx
from config import settings

logger = logging.getLogger(__name__)

SEVERITY_COLORS = {
    "critical": "#FF0000",
    "high": "#FF6B35",
    "medium": "#FFD700",
    "low": "#36A64F",
}

SEVERITY_EMOJI = {
    "critical": ":rotating_light:",
    "high": ":warning:",
    "medium": ":large_yellow_circle:",
    "low": ":large_green_circle:",
}


class Notifier:
    def __init__(self) -> None:
        self.webhook_url = settings.slack_webhook_url
        if not self.webhook_url:
            logger.warning("SLACK_WEBHOOK_URL not set — Slack notifications disabled")

    async def send_alert(self, alert: dict) -> bool:
        """Send a formatted Slack message. Returns True on success."""
        if not self.webhook_url:
            logger.info(f"[SLACK STUB] Would send alert id={alert.get('id')} severity={alert.get('severity')}")
            return False

        severity = alert.get("severity", "medium").lower()
        color = SEVERITY_COLORS.get(severity, "#888888")
        emoji = SEVERITY_EMOJI.get(severity, ":bell:")
        source_name = alert.get("source_name", "Unknown Source")
        source_url = alert.get("source_url", "")
        summary = alert.get("summary", "Regulatory change detected.")
        impacted = alert.get("impacted_depts", "")
        remediation = alert.get("remediation_steps", "")
        created_at = alert.get("created_at", "")

        # Format remediation steps: truncate if too long
        remediation_display = remediation[:400] + "…" if len(remediation) > 400 else remediation

        payload = {
            "text": f"{emoji} *ComplianceRadar Alert* — {source_name} [{severity.upper()}]",
            "attachments": [
                {
                    "color": color,
                    "blocks": [
                        {
                            "type": "header",
                            "text": {
                                "type": "plain_text",
                                "text": f"{emoji} {severity.upper()} — {source_name}",
                            },
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": f"*Summary*\n{summary}",
                            },
                        },
                        {
                            "type": "section",
                            "fields": [
                                {
                                    "type": "mrkdwn",
                                    "text": f"*Impacted Departments*\n{impacted or '—'}",
                                },
                                {
                                    "type": "mrkdwn",
                                    "text": f"*Detected At*\n{str(created_at)[:19] if created_at else '—'}",
                                },
                            ],
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": f"*Remediation Steps*\n{remediation_display}",
                            },
                        },
                        {
                            "type": "actions",
                            "elements": [
                                {
                                    "type": "button",
                                    "text": {"type": "plain_text", "text": "View Source"},
                                    "url": source_url,
                                    "style": "primary",
                                }
                            ]
                            if source_url
                            else [],
                        },
                        {
                            "type": "context",
                            "elements": [
                                {
                                    "type": "mrkdwn",
                                    "text": "Powered by *ComplianceRadar* · Bright Data × Gemini 2.5 Flash",
                                }
                            ],
                        },
                    ],
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(self.webhook_url, json=payload)
                if r.status_code == 200:
                    logger.info(f"Slack alert sent for source={source_name} severity={severity}")
                    return True
                else:
                    logger.error(f"Slack returned {r.status_code}: {r.text}")
                    return False
        except Exception as exc:
            logger.error(f"Failed to send Slack alert: {exc}")
            return False
