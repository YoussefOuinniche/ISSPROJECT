import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import { Badge } from "@/component/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { aiChatService, type ChatMessage } from "@/lib/api";

// Stable admin session UUID — stored per browser so chat history is coherent
function getOrCreateSessionId(): string {
  const KEY = "nexapath_admin_session_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    // RFC-4122 v4 UUID via crypto
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

const SESSION_ID = getOrCreateSessionId();

interface UIMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
  skills?: string[];
  goals?: string[];
}

const SUGGESTED_PROMPTS = [
  "I want to become a Full Stack Engineer. What should I focus on first?",
  "What skills are most in-demand for AI Engineers right now?",
  "I know React and Node.js — what's my biggest skill gap for a senior role?",
  "Give me a 3-month learning plan for DevOps.",
];

export default function AIChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: UIMessage = { role: "user", content: trimmed, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Build recent context (last 10 exchanges = 20 messages)
    const recentHistory: ChatMessage[] = [...messages, userMsg]
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await aiChatService.chat(SESSION_ID, trimmed, recentHistory);
      const assistantMsg: UIMessage = {
        role: "assistant",
        content: res.response,
        ts: Date.now(),
        skills: res.conversation_summary?.skills_mentioned,
        goals: res.conversation_summary?.goals_mentioned,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast({
        title: "AI unavailable",
        description: err?.message || "Could not reach the AI service. Make sure Ollama is running.",
        variant: "destructive",
      });
      // Remove the user message on error so they can retry
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function clearChat() {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-3xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Career Coach
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Powered by Ollama · qwen2.5:7b
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="gap-1.5 text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl scale-110" />
              <div className="relative w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="h-7 w-7 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold">Hey, I'm SkillPulse AI</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Ask me about career paths, skill gaps, learning roadmaps, or market trends.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-xs px-3 py-2.5 rounded-lg border border-border/60 bg-background/60 hover:bg-accent/50 hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                msg.role === "user"
                  ? "bg-primary/20 text-primary"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/60 text-foreground rounded-tl-sm border border-border/30"
                }`}
              >
                {msg.content}
              </div>

              {/* Detected context pills */}
              {msg.role === "assistant" && (
                <div className="flex flex-wrap gap-1 px-1">
                  {msg.skills?.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] py-0 h-4 border-primary/30 text-primary/70">
                      {s}
                    </Badge>
                  ))}
                  {msg.goals?.map((g) => (
                    <Badge key={g} variant="outline" className="text-[10px] py-0 h-4 border-emerald-500/30 text-emerald-400/70">
                      {g}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="bg-muted/60 border border-border/30 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about career paths, skill gaps, or learning plans…"
          disabled={loading}
          className="flex-1 bg-background/70 border-border/60 focus:border-primary/60"
          autoFocus
        />
        <Button type="submit" disabled={!input.trim() || loading} className="gap-1.5 px-4">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? "Thinking…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
