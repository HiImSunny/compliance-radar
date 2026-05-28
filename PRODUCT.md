# Product

## Register

product

## Users

Hackathon judges evaluating a compliance monitoring AI tool in a 5-minute demo window. Secondary: compliance officers and legal/risk teams at financial services, fintech, and enterprise companies who need to triage regulatory alerts before they become fines.

The primary demo audience forms their impression in the first 10 seconds of seeing the screen. They are technical, they have seen hundreds of AI demos, and they are specifically looking for evidence that this team built something real.

## Product Purpose

ComplianceRadar monitors major regulatory sources continuously, detects content changes via SHA-256 hashing, and synthesizes changes into severity-scored alerts with remediation steps using Gemini 2.5 Flash. It uses Bright Data Web Unlocker to bypass geo-restrictions on regulatory sites and Bright Data MCP Server for AI agent web data access.

Success looks like: a judge opens the dashboard, sees live data, understands the problem and solution in under 30 seconds, and thinks "this could ship."

## Brand Personality

Technical. Precise. Live.

The product should feel like mission control for regulatory risk: the kind of interface where real decisions get made under time pressure. Not a prototype. Not a demo. A system.

Voice: confident, minimal, no filler. Every label earns its place. Numbers are the heroes.

## Anti-references

- Generic AI SaaS purple gradient + rounded cards + Inter = "AI slop." The most common failure mode in hackathon demos. Avoid entirely.
- Jira, Confluence, any Atlassian product: bureaucratic, heavy, dated.
- Light gray enterprise dashboards (SAP, Oracle, legacy BI tools): reads as "internal tool from 2015."
- Cyberpunk neon excess: glowing borders everywhere, scanlines, excessive decoration. The aesthetic should be restrained and precise, not loud.
- Glassmorphism used decoratively: blur cards stacked on blur cards. Purposeful use only.

## Design Principles

1. **Data is the hero.** Numbers, severity levels, and source names should be immediately readable. No decoration competes with the data.
2. **Dark and precise.** The physical scene: a compliance officer or judge looking at a 27-inch monitor in a conference room or dim office. Dark background reduces eye strain and makes colored severity indicators pop. Light mode reads as unfinished in this context.
3. **Live, not static.** The interface should feel like it is connected to something real. Status indicators, timestamps, and data density all signal "this is running."
4. **Restraint over decoration.** One accent color. No gradients on text. No nested cards. Spacing is deliberate, not generous padding everywhere.
5. **Japanese precision aesthetic.** Inspired by neo-mirai: clean geometry, monospace accents for technical data, subtle grid structure, information density without clutter. The opposite of Western SaaS maximalism.

## Accessibility & Inclusion

WCAG 2.1 AA minimum. Severity colors must not rely on hue alone (use labels + color). Keyboard navigation required for all interactive elements. Respect prefers-reduced-motion.
