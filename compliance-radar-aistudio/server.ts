import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Detailed compliance evaluation endpoint using Gemini 3.5-flash
  app.post('/api/gemini/audit', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(400).json({
          error: 'No active Gemini API key found. Using local sandbox auditing.',
          isMock: true,
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const { content, standard, context } = req.body;

      const prompt = `You are a professional Cyber Security Compliance Auditor & regulatory auditor. 
Evaluate the following text/logs/policy files for alignment with the regulatory standard: ${standard || 'GDPR/SOC2'}.
Context/Scope: ${context || 'General Infrastructure'}

CONTENT TO PROCESS:
"""
${content}
"""

Be extremely precise. Perform a gap analysis. Identify vulnerabilities, risk levels, specific control sections breached, and provide precise actionable descriptions and mitigation scripts or actions. Return EXACTLY a JSON structure matching the schema. No backticks, no markdown wrapping, just valid JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, description: "One of: COMPLIANT, PARTIAL, NON_COMPLIANT, CRITICAL_VIOLATION" },
              score: { type: Type.NUMBER, description: "Compliance score from 0 to 100" },
              summary: { type: Type.STRING, description: "Brief audit evaluation summary" },
              findings: {
                type: Type.ARRAY,
                description: "List of gaps or compliance incidents identified",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Sequential ID, e.g. FIND-01" },
                    severity: { type: Type.STRING, description: "LOW, MEDIUM, HIGH, CRITICAL" },
                    control: { type: Type.STRING, description: "Control Standard Code (e.g. GDPR Art 32, SOC2 CC6.1, HIPAA 164.312)" },
                    issue: { type: Type.STRING, description: "Description of structural threat or missing control" },
                    impact: { type: Type.STRING, description: "Potential attack vector or administrative penalty" },
                    remediation: { type: Type.STRING, description: "Step-by-step resolution command, configuration, or structural fix" }
                  },
                  required: ["id", "severity", "control", "issue", "impact", "remediation"]
                }
              },
              verifiedAssets: {
                type: Type.ARRAY,
                description: "List of elements or policy blocks verified as compliant",
                items: { type: Type.STRING }
              }
            },
            required: ["status", "score", "summary", "findings", "verifiedAssets"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error('Emply response received from Gemini.');
      }

      res.setHeader('Content-Type', 'application/json');
      res.send(resultText);
    } catch (error: any) {
      console.error('Audit API failure:', error);
      res.status(500).json({ error: error.message || 'Server-side error during Gemini processing' });
    }
  });

  // Compliance Chat chatbot endpoint
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(400).json({
          error: 'No active Gemini API key found. Please configure GEMINI_API_KEY in Secrets panels.',
          isMock: true,
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const { message } = req.body;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: message,
        config: {
          systemInstruction: `You are the core intelligence of the Compliance Radar system—an expert AI Security officer and chief compliance auditor.
Your tone is technical, strict, and professional. 
Assist the security team in diagnosing violations, triaging system logs, writing compliance policies, and proposing clear commands/solutions. Give clear responses in Markdown format. Use list items, code blocks (commands, configs), and highlight critical elements. Keep discussions high-value and helpful. Prefer using Vietnamese language when queried in Vietnamese, otherwise English.`,
        }
      });

      res.json({ text: response.text || '' });
    } catch (error: any) {
      console.error('Chat API failure:', error);
      res.status(500).json({ error: error.message || 'Server-side error during generative chat request' });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await vite.transformIndexHtml(url, `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Compliance Radar</title>
  </head>
  <body class="bg-[#0B0E14] text-slate-300 font-sans">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Serve static files in production env
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  const port = 3000;
  app.listen(port, () => {
    console.log(`Compliance Radar application running on port ${port}`);
  });
}

startServer();
