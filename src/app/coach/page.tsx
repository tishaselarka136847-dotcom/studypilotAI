"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Trash2, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { coachReply } from "@/lib/coach";
import { uid } from "@/lib/utils";
import { AIBadge, ConfirmDialog, DemoNotice, PageHeader } from "@/components/ui";
import type { ChatMessage } from "@/lib/types";

const PROMPTS = ["Explain a difficult concept", "Make a revision checklist", "Help me organize today's study", "Give me a sample practice question", "Suggest my next topic based on my progress"];
const GREETING: ChatMessage = { id: "greet", role: "coach", text: "Hi! I'm the StudyPilot demo coach. I use fixed templates and your saved subjects to give study suggestions. Try one of the prompts below." };

// Conversation is kept for this browser session only (sessionStorage, not synced with app data).
const KEY = "studypilot-ai:coach-session";

function renderText(t: string) {
  return t.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) => (p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>));
    return <p key={i} className={line.startsWith("- ") ? "pl-3" : ""}>{parts}</p>;
  });
}

export default function CoachPage() {
  const { data } = useStore();
  const [msgs, setMsgs] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p) && p.length) setMsgs(p);
      }
    } catch { /* ignore */ }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try { sessionStorage.setItem(KEY, JSON.stringify(msgs)); } catch { /* ignore */ }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, typing]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || typing) return;
    setMsgs((m) => [...m, { id: uid("m"), role: "user", text: q }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { id: uid("m"), role: "coach", text: coachReply(q, data) }]);
      setTyping(false);
    }, 700);
  };

  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader title="AI Study Coach" badge={<AIBadge />} subtitle="A template-based study assistant that uses your subjects and progress." actions={<button className="btn-secondary btn-sm" onClick={() => setConfirm(true)}><Trash2 className="h-3.5 w-3.5" /> Clear chat</button>} />
      <div className="mb-4"><DemoNotice><b>AI Demo Mode</b> — Responses are simulated from local templates and may not be academically verified. No real AI model is connected.</DemoNotice></div>

      <div className="card flex h-[60vh] min-h-[380px] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {msgs.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-primary text-white" : "bg-violet-soft text-violet"}`}>{m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</div>
              <div className={`max-w-[85%] space-y-1 break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-white" : "bg-surface-low"}`}>
                {m.role === "coach" && <p className="text-[10px] font-semibold uppercase tracking-wide text-violet">Demo coach · simulated</p>}
                {renderText(m.text)}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex gap-2" aria-label="Coach is typing">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-soft text-violet"><Bot className="h-4 w-4" /></div>
              <div className="flex items-center gap-1 rounded-2xl bg-surface-low px-4 py-3">{[0, 1, 2].map((i) => <span key={i} className="dot h-2 w-2 rounded-full bg-violet" style={{ animationDelay: `${i * 0.16}s` }} />)}</div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-line p-3">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {PROMPTS.map((p) => <button key={p} disabled={typing} onClick={() => send(p)} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:bg-surface-low disabled:opacity-50">{p}</button>)}
          </div>
          <div className="flex gap-2">
            <input aria-label="Message the study coach" className="input" value={input} placeholder="Ask about a concept, your next topic…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)} />
            <button className="btn-primary" aria-label="Send message" disabled={!input.trim() || typing} onClick={() => send(input)}><Send className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Clear this conversation?" confirmLabel="Clear chat" message="The messages from this session will be removed." onConfirm={() => setMsgs([GREETING])} />
    </div>
  );
}
