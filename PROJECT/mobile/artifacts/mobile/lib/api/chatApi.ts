import { getMobileAccessToken, getMobileApiBaseUrl } from "@/lib/api/runtime";

export interface AIConversationSummary {
  skills_mentioned: string[];
  goals_mentioned: string[];
}

export interface AIChatResponse {
  response: string;
  message_id: string | null;
  conversation_summary: AIConversationSummary;
}

export interface ChatHistoryMessage {
  id: string;
  role: "user" | "assistant" | "system";
  message: string;
  created_at?: string;
  text: string;
  isUser: boolean;
  createdAt?: string;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizeConversationSummary(value: unknown): AIConversationSummary {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    skills_mentioned: normalizeStringArray(record.skills_mentioned),
    goals_mentioned: normalizeStringArray(record.goals_mentioned),
  };
}

async function request(path: string, options: RequestInit): Promise<unknown> {
  const token = await getMobileAccessToken();
  const baseUrl = getMobileApiBaseUrl().replace(/\/$/, "");
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string"
        ? String((payload as { message?: unknown }).message)
        : `${options.method || "GET"} ${path} failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

export async function sendChatMessageAI(message: string): Promise<AIChatResponse> {
  const payload = await request("/api/user/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });

  const envelope = payload && typeof payload === "object" && "data" in payload
    ? (payload as { data?: unknown }).data
    : payload;
  const record = envelope && typeof envelope === "object" ? (envelope as Record<string, unknown>) : {};

  return {
    response: String(record.response ?? "").trim(),
    message_id:
      typeof record.message_id === "string" && record.message_id.trim().length > 0
        ? record.message_id.trim()
        : null,
    conversation_summary: normalizeConversationSummary(record.conversation_summary),
  };
}

export async function fetchChatHistoryAI(): Promise<ChatHistoryMessage[]> {
  try {
    const payload = await request("/api/user/ai/history", {
      method: "GET",
    });

    const envelope =
      payload && typeof payload === "object" && "data" in payload
        ? (payload as { data?: unknown }).data
        : payload;

    const rawMessages =
      envelope && typeof envelope === "object" && Array.isArray((envelope as { messages?: unknown }).messages)
        ? (envelope as { messages: unknown[] }).messages
        : payload && typeof payload === "object" && Array.isArray((payload as { messages?: unknown }).messages)
        ? (payload as { messages: unknown[] }).messages
        : [];

    const messages: ChatHistoryMessage[] = [];

    rawMessages.forEach((item, index) => {
      if (!item || typeof item !== "object") return;

      const record = item as Record<string, unknown>;
      const role =
        record.role === "assistant" || record.role === "system" ? String(record.role) : "user";
      const messageText = String(record.message ?? "").trim();
      if (!messageText) return;

      const id =
        typeof record.id === "string" && record.id.trim().length > 0
          ? record.id.trim()
          : `history-${index}`;
      const createdAt =
        typeof record.created_at === "string" && record.created_at.trim().length > 0
          ? record.created_at.trim()
          : undefined;

      messages.push({
        id,
        role: role as "user" | "assistant" | "system",
        message: messageText,
        created_at: createdAt,
        text: messageText,
        isUser: role === "user",
        createdAt,
      });
    });

    return messages;
  } catch (error) {
    console.error("[chatApi] chat history request failed", error);
    return [];
  }
}
