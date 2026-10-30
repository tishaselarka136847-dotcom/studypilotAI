"use client";

import { useState } from "react";
import { Database, Moon, Monitor, RotateCcw, Sun, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { emptyData } from "@/lib/defaults";
import { clearData } from "@/lib/storage";
import { sampleData } from "@/lib/sample";
import { DAY_NAMES, cn } from "@/lib/utils";
import type { Preferences } from "@/lib/types";
import { ConfirmDialog, Field, PageHeader, Segmented } from "@/components/ui";

export default function SettingsPage() {
  const { data, update, replaceAll, toast } = useStore();
  const p = data.prefs;
  const [confirm, setConfirm] = useState<null | "sample" | "clear">(null);
  const set = (patch: Partial<Preferences>) => update((d) => ({ ...d, prefs: { ...d.prefs, ...patch } }));
  const num = (v: string, min: number, max: number, fallback: number) => {
    const n = Number(v);
    return isFinite(n) && v !== "" ? Math.min(max, Math.max(min, n)) : fallback;
  };

  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Preferences are saved automatically in this browser (localStorage). There is no account or server." />

      <section className="card mb-6 space-y-5 p-5">
        <h2 className="h2">Profile & goals</h2>
        <Field label="Display name" htmlFor="pn"><input id="pn" className="input" maxLength={40} value={p.name} placeholder="Your name" onChange={(e) => set({ name: e.target.value })} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Daily study goal (hours)" htmlFor="pg"><input id="pg" type="number" min={0.5} max={16} step={0.5} className="input tnum" value={p.dailyGoalHours} onChange={(e) => set({ dailyGoalHours: num(e.target.value, 0.5, 16, p.dailyGoalHours) })} /></Field>
          <Field label="Preferred session (min)" htmlFor="ps"><select id="ps" className="input" value={p.sessionMin} onChange={(e) => set({ sessionMin: Number(e.target.value) })}>{[25, 30, 45, 60, 90].map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Break duration (min)" htmlFor="pb"><select id="pb" className="input" value={p.breakMin} onChange={(e) => set({ breakMin: Number(e.target.value) })}>{[0, 5, 10, 15, 20].map((m) => <option key={m}>{m}</option>)}</select></Field>
        </div>
        <Field label="Daily start time" htmlFor="pt"><input id="pt" type="time" className="input sm:w-48" value={p.startTime} onChange={(e) => set({ startTime: e.target.value || "09:00" })} /></Field>
        <div>
          <span className="label">Available study days</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Available study days">
            {[1, 2, 3, 4, 5, 6, 0].map((n) => {
              const on = p.studyDays.includes(n);
              return <button key={n} aria-pressed={on} onClick={() => { const next = on ? p.studyDays.filter((x) => x !== n) : [...p.studyDays, n].sort(); if (!next.length) return toast("Keep at least one study day selected.", "error"); set({ studyDays: next }); }} className={cn("h-10 w-12 rounded-lg text-sm font-semibold", on ? "bg-primary text-white" : "border border-line text-muted hover:bg-surface-low")}>{DAY_NAMES[n]}</button>;
            })}
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" className="h-4 w-4 accent-primary" checked={p.revision} onChange={(e) => set({ revision: e.target.checked })} /><span className="text-sm">Include revision sessions by default in new plans</span></label>
        <div>
          <span className="label">Theme</span>
          <Segmented<Preferences["theme"]> label="Theme" value={p.theme} onChange={(v) => set({ theme: v })} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" }]} />
          <p className="mt-1 flex items-center gap-1 text-xs text-muted">{p.theme === "dark" ? <Moon className="h-3 w-3" /> : p.theme === "light" ? <Sun className="h-3 w-3" /> : <Monitor className="h-3 w-3" />} Applies instantly.</p>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="h2">Data management</h2>
        <p className="text-sm text-muted">Currently storing {data.subjects.length} subject(s), {data.focusSessions.length} focus session(s), {data.quizAttempts.length} quiz attempt(s) and {data.flashcards.length} flashcard(s) in this browser.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setConfirm("sample")}><RotateCcw className="h-4 w-4" /> Reset to sample data</button>
          <button className="btn-danger" onClick={() => setConfirm("clear")}><Trash2 className="h-4 w-4" /> Clear all saved data</button>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted"><Database className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Sample data contains demonstration subjects, topics and flashcards only — no fake study history.</p>
      </section>

      <ConfirmDialog open={confirm === "sample"} onClose={() => setConfirm(null)} danger title="Reset to sample data?" confirmLabel="Reset" message="This replaces ALL your current subjects, plans, summaries, quizzes and study history with the demonstration dataset (your preferences are kept)." onConfirm={() => { replaceAll(sampleData({ ...emptyData(), prefs: data.prefs })); toast("Sample data loaded", "info"); }} />
      <ConfirmDialog open={confirm === "clear"} onClose={() => setConfirm(null)} title="Clear all saved data?" confirmLabel="Clear everything" message="This permanently deletes every subject, plan, summary, quiz result, flashcard and focus session saved in this browser, and resets your preferences. This cannot be undone." onConfirm={() => { clearData(); replaceAll(emptyData()); toast("All saved data cleared", "info"); }} />
    </div>
  );
}
