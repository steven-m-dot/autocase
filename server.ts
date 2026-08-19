import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Gemini API route - keeping Gemini API key server-side
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt, json = false, systemInstruction } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const ai = getGenAI();
      const config: Record<string, any> = {};

      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      if (json) {
        config.responseMimeType = "application/json";
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      const text = response.text || "";

      if (json) {
        try {
          const parsed = JSON.parse(text);
          return res.json({ text, data: parsed });
        } catch {
          // If JSON parse fails, attempt stripping code blocks or finding JSON object boundaries
          const cleaned = text
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
          try {
            const parsed = JSON.parse(cleaned);
            return res.json({ text, data: parsed });
          } catch {
            const start = text.indexOf("{");
            const end = text.lastIndexOf("}");
            if (start !== -1 && end !== -1 && end > start) {
              const substring = text.substring(start, end + 1);
              const parsed = JSON.parse(substring);
              return res.json({ text, data: parsed });
            }
            throw new Error("Model response could not be parsed into JSON structure.");
          }
        }
      }

      return res.json({ text });
    } catch (err: any) {
      console.error("Gemini API error:", err);
      return res.status(500).json({
        error: err?.message || "An error occurred while communicating with Gemini API",
      });
    }
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
