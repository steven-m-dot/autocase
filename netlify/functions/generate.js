import { GoogleGenAI } from "@google/genai";

let genAIClient = null;

function getGenAI() {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on Netlify. Please set GEMINI_API_KEY in your Netlify site settings (Site configuration -> Environment variables) and trigger a redeploy.");
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

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: Object.keys(config).length > 0 ? config : undefined,
    });

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
        body: JSON.stringify({ text, data }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    console.error("Netlify Gemini function error:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: err?.message || "An error occurred while communicating with Gemini API on Netlify",
      }),
    };
  }
}
