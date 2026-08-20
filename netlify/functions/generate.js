import { GoogleGenAI } from "@google/genai";

let genAIClient = null;

function getGenAI() {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured on Netlify. Please set GEMINI_API_KEY in your Netlify site settings (Site configuration -> Environment variables) and trigger a redeploy."
      );
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

async function generateWithFallback(ai, contents, config) {
  let lastError = null;

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
      } catch (err) {
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

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : event.body || {};
    const { prompt, json = false, systemInstruction } = body;

    if (!prompt) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Prompt is required" }),
      };
    }

    const ai = getGenAI();
    const config = {};

    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    if (json) {
      config.responseMimeType = "application/json";
    }

    const { response, modelUsed } = await generateWithFallback(ai, prompt, config);
    const text = response.text || "";

    if (json) {
      let data;
      try {
        data = JSON.parse(text);
      } catch {
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
            data = JSON.parse(text.substring(start, end + 1));
          } else {
            throw new Error("Model response could not be parsed into JSON structure.");
          }
        }
      }
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ text, data, modelUsed }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ text, modelUsed }),
    };
  } catch (err) {
    console.error("Netlify Gemini function error:", err);
    let message = err?.message || "An error occurred while communicating with Gemini API on Netlify";
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

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: message,
      }),
    };
  }
}
