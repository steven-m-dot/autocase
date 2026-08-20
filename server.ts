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

const CANDIDATE_MODELS = [
  "gemini-3.7-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

async function generateWithFallback(ai: GoogleGenAI, contents: string, config: Record<string, any>) {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: Object.keys(config).length > 0 ? config : undefined,
        });
        if (response && (response.text !== undefined || response.candidates)) {
          return { response, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        console.warn(`Attempt with ${model} (attempt ${attempt}) failed: ${errMsg}`);

        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("overloaded");

        if (isTransient && attempt < 2) {
          await new Promise((res) => setTimeout(res, 800 * attempt));
          continue;
        }
        break; // try next candidate model
      }
    }
  }

  throw (
    lastError ||
    new Error(
      "Gemini service is experiencing high demand. Please try again in a few moments."
    )
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Gemini API route - keeping Gemini API key server-side with fallback & retries
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

      const { response, modelUsed } = await generateWithFallback(ai, prompt, config);
      const text = response.text || "";

      if (json) {
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          // If JSON parse fails, attempt stripping code blocks or finding JSON object boundaries
          const cleaned = text
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
          try {
            data = JSON.parse(cleaned);
          } catch {
            const start = text.indexOf("{");
            const end = text.lastIndexOf("}");
            if (start !== -1 && end !== -1 && end > start) {
              const substring = text.substring(start, end + 1);
              data = JSON.parse(substring);
            } else {
              throw new Error("Model response could not be parsed into JSON structure.");
            }
          }
        }
        return res.json({ text, data, modelUsed });
      }

      return res.json({ text, modelUsed });
    } catch (err: any) {
      console.error("Gemini API error:", err);
      let message = err?.message || "An error occurred while communicating with Gemini API";
      try {
        if (typeof message === "string" && message.trim().startsWith("{")) {
          const parsedErr = JSON.parse(message);
          if (parsedErr?.error?.message) {
            message = parsedErr.error.message;
          }
        }
      } catch {
        // keep original message
      }

      return res.status(500).json({
        error: message,
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
