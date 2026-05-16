import { GoogleGenerativeAI } from "@google/generative-ai";

// Model preference order: try each in sequence until one succeeds
const MODEL_CANDIDATES = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
];

let _client: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!_client) _client = new GoogleGenerativeAI(key);
  return _client;
}

export function isAiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota");
}

function retryDelaySecs(err: unknown): number {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/retry in ([\d.]+)s/i);
  return m ? Math.min(Math.ceil(Number(m[1])), 60) : 15;
}

/** Calls Gemini and returns parsed JSON, or null on any failure. Tries model candidates in order. */
export async function callGeminiJson<T>(prompt: string, timeoutMs = 8_000): Promise<T | null> {
  const client = getGeminiClient();
  if (!client) return null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 8192
        }
      });

      // Race the Gemini call against a timeout
      const callPromise = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini timeout")), timeoutMs)
      );

      const result = await Promise.race([callPromise, timeoutPromise]);
      const text = result.response.text();
      return JSON.parse(text) as T;

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isRateLimit(err)) {
        // Don't wait — move to the next model immediately so the page doesn't stall
        console.warn(`[AI] ${modelName} rate limited — skipping to next model`);
        continue;
      }
      // 404 = model not found, try next
      if (msg.includes("404") || msg.includes("not found")) {
        continue;
      }
      console.error(`[AI] ${modelName} failed:`, msg.slice(0, 200));
      continue;
    }
  }

  console.error("[AI] All Gemini model candidates failed — falling back to rule-based");
  return null;
}
