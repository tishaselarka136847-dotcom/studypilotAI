"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useStore } from "@/lib/store";
import { useTimer } from "@/lib/timer";
import { fmtDuration, timeAgo, todayISO, toISO } from "@/lib/utils";
import { EmptyState, Field, PageHeader, Ring } from "@/components/ui";

export default function FocusPage() {
  const { data } = useStore();
  const tm = useTimer();
  const t = todayISO();
  const pending = (data.plan?.sessions ?? []).filter((s) => !s.completed && s.date === t).sort((a, b) => a.start.localeCompare(b.start));
  const [taskId, setTaskId] = useState<string>(tm.config.planSessionId ?? "custom");
  const [custom, setCustom] = useState(tm.config.planSessionId ? "" : tm.config.label);
  const [customSubject, setCustomSubject] = useState(tm.config.subjectId ?? "");
  const idle = tm.status === "idle" || tm.status === "done";

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session");
    if (id && tm.status === "idle") {
      const s = (data.plan?.sessions ?? []).find((x) => x.id === id);
      if (s && !s.completed) {
        setTaskId(id);
        tm.configure({ label: s.topicTitle, subjectId: s.subjectId, planSessionId: id, minutes: s.durationMin });
      }
    }
  }, []);

  const pickTask = (id: string) => {
    setTaskId(id);
    if (id === "custom") tm.configure({ label: custom, subjectId: customSubject || undefined, planSessionId: undefined });
    else {
      const s = pending.find((x) => x.id === id);
      if (s) tm.configure({ label: s.topicTitle, subjectId: s.subjectId, planSessionId: id, minutes: s.durationMin });
    }
  };

  const mm = String(Math.floor(tm.remainingSec / 60)).padStart(2, "0");
  const ss = String(tm.remainingSec % 60).padStart(2, "0");
  const progress = tm.plannedSec ? ((tm.plannedSec - tm.remainingSec) / tm.plannedSec) * 100 : 0;
  const todayMin = data.focusSessions.filter((f) => toISO(new Date(f.completedAt)) === t).reduce((a, f) => a + f.activeSec / 60, 0);

  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader title="Focus Session" subtitle="A countdown that only counts the time you are actively studying. Paused time is never recorded." />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="card flex flex-col items-center p-6">
          <Ring value={progress} size={220} stroke={10}>
            <div className="text-center">
              <p className="font-display text-5xl font-bold tnum" aria-live="off" role="timer" aria-label={`${mm} minutes ${ss} seconds remaining`}>{mm}:{ss}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">{tm.status === "running" ? "Focusing" : tm.status === "paused" ? "Paused" : tm.status === "done" ? "Complete" : "Ready"}</p>
            </div>
          </Ring>
          <p className="mt-3 max-w-full truncate text-sm text-muted">{tm.config.label || "Custom focus session"}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {(tm.status === "idle" || tm.status === "done") && <button className="btn-primary h-12 px-8" onClick={tm.start}><Play className="h-4 w-4" /> {tm.status === "done" ? "Start again" : "Start"}</button>}
            {tm.status === "running" && <button className="btn-secondary h-12 px-8" onClick={tm.pause}><Pause className="h-4 w-4" /> Pause</button>}
            {tm.status === "paused" && <button className="btn-primary h-12 px-8" onClick={tm.resume}><Play className="h-4 w-4" /> Resume</button>}
            <button className="btn-secondary h-12" onClick={tm.reset} disabled={tm.status === "idle"}><RotateCcw className="h-4 w-4" /> Reset</button>
          </div>
          {tm.status === "done" && <p className="mt-4 flex items-center gap-2 rounded-lg bg-teal-soft px-3 py-2 text-sm font-medium text-teal" role="status"><CheckCircle2 className="h-4 w-4" /> Session complete and saved.</p>}
          <p className="mt-4 text-center text-xs text-muted">Only completed sessions are saved. Resetting discards the current run.</p>
        </section>

        <section className="card space-y-4 p-5">
          <Field label="Study task" htmlFor="ft">
            <select id="ft" className="input" disabled={!idle} value={taskId} onChange={(e) => pickTask(e.target.value)}>
              <option value="custom">Custom task</option>
              {pending.map((s) => <option key={s.id} value={s.id}>{s.start} · {s.topicTitle}</option>)}
            </select>
          </Field>
          {taskId === "custom" && (
            <>
              <Field label="What are you studying?" htmlFor="fl"><input id="fl" className="input" disabled={!idle} value={custom} placeholder="e.g. Read chapter 4" onChange={(e) => { setCustom(e.target.value); tm.configure({ label: e.target.value }); }} /></Field>
              <Field label="Subject (optional)" htmlFor="fsb"><select id="fsb" className="input" disabled={!idle} value={customSubject} onChange={(e) => { setCustomSubject(e.target.value); tm.configure({ subjectId: e.target.value || undefined }); }}><option value="">None</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            </>
          )}
          <Field label="Duration (minutes)" htmlFor="fd" hint="1–300 minutes">
            <input id="fd" type="number" min={1} max={300} className="input tnum" disabled={!idle} value={tm.config.minutes} onChange={(e) => tm.configure({ minutes: Math.min(300, Math.max(1, Math.round(Number(e.target.value) || 1))) })} />
          </Field>
          <div className="flex flex-wrap gap-2">{[1, 15, 25, 45, 60].map((m) => <button key={m} disabled={!idle} onClick={() => tm.configure({ minutes: m })} className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50 ${tm.config.minutes === m ? "border-primary bg-primary-soft text-primary" : "border-line hover:bg-surface-low"}`}>{m} min</button>)}</div>
          {pending.length === 0 && <p className="text-xs text-muted">No pending planned sessions today — create a plan to pick tasks here.</p>}
        </section>
      </div>

      <section className="card mt-6 p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="h2">Recent focus sessions</h2><span className="text-sm text-muted tnum">Today: {fmtDuration(Math.round(todayMin))}</span></div>
        {data.focusSessions.length === 0 ? <EmptyState icon={<Timer className="h-5 w-5" />} title="No completed sessions yet" text="Finish a countdown to record your first session. Tip: set 1 minute to try it out." /> : (
          <ul className="divide-y divide-line">
            {[...data.focusSessions].reverse().slice(0, 8).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 py-2.5 text-sm"><span className="min-w-0 truncate font-medium">{f.label}</span><span className="shrink-0 text-xs text-muted tnum">{fmtDuration(Math.max(1, Math.round(f.activeSec / 60)))} · {timeAgo(f.completedAt)}</span></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
