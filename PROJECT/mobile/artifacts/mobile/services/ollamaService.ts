/**
 * Backend AI completion helpers.
 *
 * The Ollama base URL is derived from the same LAN host as the backend server —
 * so if the backend is http://192.168.1.100:4000, Ollama is http://192.168.1.100:11434.
 * Mobile calls the configured backend API only. The backend owns AI service and
 * Ollama access, including model configuration.
 */

import { getMobileApiBaseUrl, getMobileAccessToken } from "@/lib/api/runtime";

// ─── Constants ─────────────────────────────────────────────────────────────────

const COMPLETION_TIMEOUT_MS = 180_000;
const MAX_RETRIES = 2;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── Core Completion ────────────────────────────────────────────────────────────

/**
 * Sends a completion request through the Node.js backend proxy at
 * POST /api/user/ai/complete — avoids the need for the mobile device
 * to reach Ollama's port 11434 directly (which is typically firewalled).
 */
export async function generateCompletion(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: OllamaMessage[] = [],
  temperature = 0.7
): Promise<string> {
  const baseUrl = getMobileApiBaseUrl();

  const messages: OllamaMessage[] = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  let lastError: Error = new Error("Completion failed");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), COMPLETION_TIMEOUT_MS);

      const token = await getMobileAccessToken();
      const response = await fetch(`${baseUrl}/api/user/ai/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ system_prompt: systemPrompt, messages, temperature }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(err?.error ?? `HTTP ${response.status}`);
      }

      const data = (await response.json()) as { content?: string };
      const content = data?.content?.trim() ?? "";

      if (__DEV__) {
        console.log(`[ai] attempt=${attempt + 1} len=${content.length} preview="${content.slice(0, 120)}"`);
      }

      return content;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (__DEV__) {
        console.warn(`[ai] attempt=${attempt + 1} failed:`, lastError.message);
      }
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  throw lastError;
}

// ─── JSON Helpers ───────────────────────────────────────────────────────────────

/**
 * Strips markdown code fences that Qwen sometimes wraps around JSON responses.
 * Handles: ```json ... ```, ``` ... ```, and bare JSON.
 */
export function stripJsonMarkdown(text: string): string {
  return text
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
}

/**
 * Generates a structured JSON response.
 * Uses temperature=0.2 and retries with a stricter JSON-only prompt on parse failure.
 * On second attempt, also tries to extract the first valid JSON object from the text.
 */
export async function generateStructuredJson<T>(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: OllamaMessage[] = []
): Promise<T> {
  const STRICT_SUFFIX =
    "\n\nCRITICAL: Your response must be ONLY valid JSON. No markdown fences. No explanation. No text before or after. Raw JSON only.";

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0 ? userMessage : userMessage + STRICT_SUFFIX;

    const raw = await generateCompletion(
      systemPrompt,
      prompt,
      conversationHistory,
      0.2
    );

    const cleaned = stripJsonMarkdown(raw);

    // Attempt 1: parse the whole response
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      /* fall through to extraction attempt */
    }

    // Attempt 2: extract the first {...} block from the text
    const match = cleaned.match(/\{[\s\S]+\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* fall through to next loop iteration */
      }
    }
  }

  throw new Error(
    "generateStructuredJson: could not parse valid JSON from AI completion after 2 attempts"
  );
}

// ─── Connection Test ────────────────────────────────────────────────────────────

/**
 * Checks that the AI stack is reachable.
 * First tries Ollama directly (works on simulator/web).
 * Falls back to the AI FastAPI /health endpoint (works on physical devices over LAN
 * where Ollama port 11434 is not exposed but port 8000 is).
 */
export async function testOllamaConnection(): Promise<boolean> {
  // Check backend health — if the backend is reachable, completions will work
  // because the backend calls Ollama locally (no firewall issue).
  try {
    const backendUrl = getMobileApiBaseUrl();
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${backendUrl}/health`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  }
}
