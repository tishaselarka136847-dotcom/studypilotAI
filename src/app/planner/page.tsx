"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Circle, List, Pencil, Play, Save, Trash2, Wand2, CalendarDays, Info } from "lucide-react";
import { useStore, withLog } from "@/lib/store";
import { findProblems, generatePlan } from "@/lib/scheduler";
import type { Activity, PlanSettings, Priority, StudyPlan, StudySession } from "@/lib/types";
import { DAY_NAMES, addDays, cn, fmtDate, fmtDuration, fmtTime12, startOfWeek, toMin, todayISO } from "@/lib/utils";
import { AIBadge, ConfirmDialog, EmptyState, Field, Modal, PageHeader, Segmented, SubjectDot } from "@/components/ui";

export default function PlannerPage() {
  const { data, update, toast } = useStore();
  const t = todayISO();
  const prefs = data.prefs;

  const [settings, setSettings] = useState<PlanSettings>(() => ({
    subjectIds: data.subjects.filter((s) => s.topics.some((x) => !x.completed)).map((s) => s.id),
    studyDays: prefs.studyDays,
    dailyHours: prefs.dailyGoalHours,
    sessionMin: prefs.sessionMin,
    breakMin: prefs.breakMin,
    revision: prefs.revision,
    startTime: prefs.startTime,
    startDate: t,
  }));
  const [draft, setDraft] = useState<StudyPlan | null>(null);
  const [view, setView] = useState<"week" | "list">("week");
  const [weekStart, setWeekStart] = useState(startOfWeek(t));
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [editErr, setEditErr] = useState("");
  const [confirm, setConfirm] = useState<null | "generate" | "save">(null);
  const [genErr, setGenErr] = useState("");

  const plan: StudyPlan | null = draft ?? data.plan;
  const sub = (id: string) => data.subjects.find((s) => s.id === id);
  const dailyLimit = (plan?.settings.dailyHours ?? settings.dailyHours) * 60;

  const visible = useMemo(() => (plan?.sessions ?? []).filter((s) => filter === "all" || s.subjectId === filter), [plan, filter]);

  const doGenerate = () => {
    const now = new Date();
    const result = generatePlan(data.subjects, { ...settings, startDate: t }, now.getHours() * 60 + now.getMinutes());
    setDraft(result);
    setWeekStart(startOfWeek(result.sessions[0]?.date ?? t));
    setFilter("all");
    toast(result.sessions.length ? `Generated ${result.sessions.length} study sessions (draft — save to keep it)` : "No sessions could be generated", result.sessions.length ? "success" : "error");
  };

  const requestGenerate = () => {
    if (!settings.subjectIds.length) return setGenErr("Select at least one subject.");
    if (!settings.studyDays.length) return setGenErr("Select at least one available study day.");
    if (settings.dailyHours < 0.5) return setGenErr("Daily study hours must be at least 0.5.");
    setGenErr("");
    const customized = draft ? draft.customized : data.plan?.customized;
    if (customized) setConfirm("generate");
    else doGenerate();
  };

  const savePlan = () => {
    if (!draft) return;
    update((d) => withLog({ ...d, plan: draft }, "plan", `Saved a study plan with ${draft.sessions.length} sessions`));
    setDraft(null);
    toast("Study plan saved");
  };
  const requestSave = () => (data.plan?.customized ? setConfirm("save") : savePlan());

  const mutate = (fn: (sessions: StudySession[]) => StudySession[], markCustom: boolean) => {
    if (draft) setDraft({ ...draft, sessions: fn(draft.sessions), customized: draft.customized || markCustom });
    else update((d) => (d.plan ? { ...d, plan: { ...d.plan, sessions: fn(d.plan.sessions), customized: d.plan.customized || markCustom } } : d));
  };

  const toggleDone = (id: string) =>
    mutate((ss) => ss.map((s) => (s.id === id ? (s.completed ? { ...s, completed: false, completedAt: undefined, completedVia: undefined } : { ...s, completed: true, completedAt: new Date().toISOString(), completedVia: "manual" as const }) : s)), false);

  const deleteSession = (id: string) => {
    mutate((ss) => ss.filter((s) => s.id !== id), true);
    toast("Session deleted");
  };

  const saveEdit = () => {
    if (!editing || !plan) return;
    const e = editing;
    if (!e.topicTitle.trim()) return setEditErr("Please enter a topic or task name.");
    const s0 = toMin(e.start), e0 = toMin(e.end);
    if (!/^\d{2}:\d{2}$/.test(e.start) || !/^\d{2}:\d{2}$/.test(e.end)) return setEditErr("Enter valid start and end times.");
    if (e0 <= s0) return setEditErr("End time must be after the start time.");
    if (e0 > 23 * 60 + 59) return setEditErr("Sessions must finish before midnight.");
    const others = plan.sessions.filter((s) => s.id !== e.id && s.date === e.date);
    if (others.some((o) => s0 < toMin(o.end) && e0 > toMin(o.start))) return setEditErr("This overlaps another session on the same day.");
    const total = others.reduce((a, o) => a + o.durationMin, 0) + (e0 - s0);
    if (total > dailyLimit) return setEditErr(`That would exceed your daily limit of ${fmtDuration(dailyLimit)} (it would be ${fmtDuration(total)}).`);
    const sb = sub(e.subjectId);
    if (sb?.examDate && e.date >= sb.examDate) return setEditErr(`${sb.name} has its exam on ${fmtDate(sb.examDate)} — sessions must be before that date.`);
    setEditErr("");
    mutate((ss) => ss.map((s) => (s.id === e.id ? { ...e, topicTitle: e.topicTitle.trim(), durationMin: e0 - s0 } : s)).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)), true);
    setEditing(null);
    toast("Session updated");
  };

  const toggleDay = (n: number) => setSettings((s) => ({ ...s, studyDays: s.studyDays.includes(n) ? s.studyDays.filter((x) => x !== n) : [...s.studyDays, n].sort() }));
  const toggleSubject = (id: string) => setSettings((s) => ({ ...s, subjectIds: s.subjectIds.includes(id) ? s.subjectIds.filter((x) => x !== id) : [...s.subjectIds, id] }));

  const problems = plan ? findProblems(plan.sessions, plan.settings.dailyHours, data.subjects) : [];
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const exams = data.subjects.filter((s) => s.examDate);

  const SessionCard = ({ s, compact }: { s: StudySession; compact?: boolean }) => {
    const sb = sub(s.subjectId);
    return (
      <div className={cn("rounded-xl border border-line bg-card p-2.5 text-left shadow-card", s.completed && "opacity-70")} style={{ borderLeft: `3px solid ${sb?.color ?? "#94a3b8"}` }}>
        <div className="flex items-start justify-between gap-1">
          <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide" style={{ color: sb?.color }}>{sb?.name ?? "Subject"}</p>
          <span className={s.priority === "High" ? "pill-red !px-1.5 !py-0" : s.priority === "Medium" ? "pill-amber !px-1.5 !py-0" : "pill-gray !px-1.5 !py-0"}>{s.priority}</span>
        </div>
        <p className={cn("mt-1 break-words text-sm font-semibold leading-snug", s.completed && "line-through")}>{s.topicTitle}</p>
        <p className="mt-0.5 text-xs text-muted tnum">{fmtTime12(s.start)} – {fmtTime12(s.end)} · {fmtDuration(s.durationMin)}</p>
        {!compact && <p className="mt-0.5 text-[11px] text-muted">{s.activity}</p>}
        <div className="mt-2 flex items-center gap-1">
          <button aria-label={s.completed ? "Mark pending" : "Mark completed"} aria-pressed={s.completed} className="rounded-md p-1 hover:bg-surface-low" onClick={() => toggleDone(s.id)}>
            {s.completed ? <CheckCircle2 className="h-4 w-4 text-teal" /> : <Circle className="h-4 w-4 text-muted" />}
          </button>
          <button aria-label="Edit session" className="rounded-md p-1 text-muted hover:bg-surface-low" onClick={() => { setEditErr(""); setEditing(s); }}><Pencil className="h-4 w-4" /></button>
          <button aria-label="Delete session" className="rounded-md p-1 text-muted hover:bg-danger-soft hover:text-danger" onClick={() => deleteSession(s.id)}><Trash2 className="h-4 w-4" /></button>
          {!draft && !s.completed && s.date === t && <Link href={`/focus?session=${s.id}`} aria-label="Start focus session" className="ml-auto rounded-md bg-primary p-1 text-white"><Play className="h-3.5 w-3.5" /></Link>}
        </div>
      </div>
    );
  };

  return (
    <div className="fade-up">
      <PageHeader title="Study Planner" badge={<AIBadge>AI Demo Mode · rule-based scheduler</AIBadge>} subtitle="Generate a balanced timetable from your subjects, exam dates, confidence and the time you really have. Everything runs locally in your browser." />

      {data.subjects.length === 0 ? (
        <div className="card p-4"><EmptyState icon={<CalendarCheck className="h-6 w-6" />} title="Add subjects first" text="The planner needs subjects with syllabus topics. Add your own or load the sample data." action={<Link href="/subjects" className="btn-primary">Go to My Subjects</Link>} /></div>
      ) : (
        <>
          <section className="card mb-6 p-5">
            <h2 className="h2 mb-4">Plan settings</h2>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-3">
                <span className="label">Subjects to include</span>
                <div className="flex flex-wrap gap-2">
                  {data.subjects.map((s) => {
                    const pending = s.topics.filter((x) => !x.completed).length;
                    const on = settings.subjectIds.includes(s.id);
                    return (
                      <button key={s.id} aria-pressed={on} onClick={() => toggleSubject(s.id)} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors", on ? "border-primary bg-primary-soft" : "border-line hover:bg-surface-low")}>
                        <SubjectDot color={s.color} />
                        <span className="font-medium">{s.name}</span>
                        <span className="text-xs text-muted">{pending} pending · {s.examDate ? fmtDate(s.examDate, { day: "numeric", month: "short" }) : "no exam date"} · conf {s.confidence}/5</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <span className="label">Available study days</span>
                <div className="flex gap-1.5" role="group" aria-label="Available study days">
                  {[1, 2, 3, 4, 5, 6, 0].map((n) => (
                    <button key={n} aria-pressed={settings.studyDays.includes(n)} aria-label={DAY_NAMES[n]} onClick={() => toggleDay(n)} className={cn("h-9 w-9 rounded-lg text-xs font-bold", settings.studyDays.includes(n) ? "bg-primary text-white" : "border border-line text-muted hover:bg-surface-low")}>{DAY_NAMES[n].charAt(0)}</button>
                  ))}
                </div>
              </div>
              <Field label="Daily study hours" htmlFor="dh">
                <div className="flex items-center gap-2">
                  <button className="btn-secondary !px-3" aria-label="Decrease hours" onClick={() => setSettings((s) => ({ ...s, dailyHours: Math.max(0.5, Math.round((s.dailyHours - 0.5) * 2) / 2) }))}>−</button>
                  <input id="dh" type="number" min={0.5} max={14} step={0.5} className="input text-center tnum" value={settings.dailyHours} onChange={(e) => setSettings((s) => ({ ...s, dailyHours: Math.min(14, Math.max(0, Number(e.target.value))) }))} />
                  <button className="btn-secondary !px-3" aria-label="Increase hours" onClick={() => setSettings((s) => ({ ...s, dailyHours: Math.min(14, s.dailyHours + 0.5) }))}>+</button>
                </div>
              </Field>
              <Field label="Daily start time" htmlFor="st"><input id="st" type="time" className="input" value={settings.startTime} onChange={(e) => setSettings((s) => ({ ...s, startTime: e.target.value || "09:00" }))} /></Field>
              <Field label="Preferred session length" htmlFor="sl">
                <select id="sl" className="input" value={settings.sessionMin} onChange={(e) => setSettings((s) => ({ ...s, sessionMin: Number(e.target.value) }))}>{[25, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select>
              </Field>
              <Field label="Break between sessions" htmlFor="bk">
                <select id="bk" className="input" value={settings.breakMin} onChange={(e) => setSettings((s) => ({ ...s, breakMin: Number(e.target.value) }))}>{[0, 5, 10, 15, 20].map((m) => <option key={m} value={m}>{m === 0 ? "No breaks" : `${m} minutes`}</option>)}</select>
              </Field>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-3 sm:self-end">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={settings.revision} onChange={(e) => setSettings((s) => ({ ...s, revision: e.target.checked }))} />
                <span><span className="block text-sm font-semibold">Include revision sessions</span><span className="block text-xs text-muted">Adds review blocks after each subject&apos;s topics</span></span>
              </label>
            </div>
            {genErr && <p className="mt-3 text-sm font-medium text-danger" role="alert">{genErr}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <button className="btn-ai" onClick={requestGenerate}><Wand2 className="h-4 w-4" /> {plan ? "Regenerate Plan" : "Generate Study Plan"}</button>
              <p className="text-xs text-muted">Daily limit counts study minutes only; breaks are added on top. Starting {fmtDate(t)}.</p>
            </div>
          </section>

          {draft && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet/30 bg-violet-soft px-4 py-3">
              <p className="flex items-center gap-2 text-sm"><Info className="h-4 w-4 text-violet" /> <b>Draft plan</b> — not saved yet. Edit it freely, then save.</p>
              <div className="flex gap-2"><button className="btn-secondary btn-sm" onClick={() => setDraft(null)}>Discard</button><button className="btn-primary btn-sm" onClick={requestSave}><Save className="h-3.5 w-3.5" /> Save plan</button></div>
            </div>
          )}

          {plan && plan.warnings.length > 0 && (
            <div className="mb-4 rounded-xl border border-warn/30 bg-warn-soft p-4 text-sm text-ink" role="alert">
              {plan.warnings.map((w, i) => <p key={i} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" /> {w}</p>)}
            </div>
          )}
          {problems.length > 0 && (
            <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm" role="alert"><b>Timetable conflicts after edits:</b> {problems.slice(0, 3).join("; ")}</div>
          )}

          {plan && plan.unscheduled.length > 0 && (
            <section className="card mb-6 border-warn/40 p-5">
              <h2 className="h2 mb-1 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warn" /> Unscheduled topics ({plan.unscheduled.length})</h2>
              <p className="mb-3 text-sm text-muted">These could not be placed without exceeding your limits.</p>
              <ul className="divide-y divide-line text-sm">
                {plan.unscheduled.map((u, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="flex min-w-0 items-center gap-2"><SubjectDot color={sub(u.subjectId)?.color ?? "#94a3b8"} /><span className="break-words font-medium">{u.topicTitle}</span><span className="text-xs text-muted">({sub(u.subjectId)?.name})</span></span>
                    <span className="text-xs text-muted">{fmtDuration(u.minutesLeft)} left · {u.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!plan ? (
            <div className="card p-4"><EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No timetable yet" text="Choose your settings above and generate a plan. You can then edit sessions, mark them complete and save it." /></div>
          ) : plan.sessions.length === 0 ? (
            <div className="card p-4"><EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No sessions in this plan" text="Nothing could be scheduled. Check that your subjects have pending topics, exam dates in the future and study days selected." /></div>
          ) : (
            <section className="card p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                  {view === "week" && (
                    <>
                      <button className="btn-secondary !px-2" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></button>
                      <h2 className="h2 min-w-[11rem] text-center text-base">{fmtDate(weekStart, { day: "numeric", month: "short" })} – {fmtDate(addDays(weekStart, 6), { day: "numeric", month: "short" })}</h2>
                      <button className="btn-secondary !px-2" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></button>
                      <button className="btn-ghost btn-sm" onClick={() => setWeekStart(startOfWeek(t))}>Today</button>
                    </>
                  )}
                  {view === "list" && <h2 className="h2">All study tasks</h2>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select aria-label="Filter by subject" className="input !h-9 w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="all">All subjects</option>
                    {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <Segmented<"week" | "list"> label="Timetable view" value={view} onChange={setView} options={[{ value: "week", label: "Week" }, { value: "list", label: "List" }]} />
                </div>
              </div>

              {view === "week" ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-7">
                  {weekDays.map((day) => {
                    const items = visible.filter((s) => s.date === day).sort((a, b) => a.start.localeCompare(b.start));
                    const examsToday = exams.filter((e) => e.examDate === day);
                    const isToday = day === t;
                    return (
                      <div key={day} className={cn("min-w-0 rounded-xl border p-2.5", isToday ? "border-primary bg-primary-soft/50" : "border-line bg-surface-low/50", examsToday.length > 0 && "border-danger/50")}>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted">{DAY_NAMES[new Date(day + "T00:00").getDay()]} <span className="text-ink">{Number(day.slice(8))}</span></p>
                          {isToday ? <span className="pill-blue !py-0">Today</span> : items.length > 0 && <span className="text-[11px] text-muted">{items.length}</span>}
                        </div>
                        {examsToday.map((e) => <div key={e.id} className="mb-2 rounded-lg bg-danger-soft px-2 py-1.5 text-xs font-semibold text-danger">Exam: {e.name}</div>)}
                        <div className="space-y-2">
                          {items.map((s) => <SessionCard key={s.id} s={s} compact />)}
                          {items.length === 0 && !examsToday.length && <p className="py-3 text-center text-xs text-muted">No sessions</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-5">
                  {Array.from(new Set<string>(visible.map((s) => s.date))).sort().map((day) => (
                    <div key={day}>
                      <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><List className="h-4 w-4 text-muted" /> {fmtDate(day, { weekday: "long", day: "numeric", month: "short" })} {day === t && <span className="pill-blue">Today</span>}</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{visible.filter((s) => s.date === day).map((s) => <SessionCard key={s.id} s={s} />)}</div>
                    </div>
                  ))}
                  {visible.length === 0 && <p className="py-6 text-center text-sm text-muted">No sessions for this subject.</p>}
                </div>
              )}
              <p className="mt-4 text-xs text-muted">{plan.sessions.filter((s) => s.completed).length}/{plan.sessions.length} sessions completed · {data.plan && !draft ? "Saved plan" : "Draft"}{plan.customized ? " · customised" : ""}</p>
            </section>
          )}
        </>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit session">
        {editing && (
          <div className="space-y-4">
            <Field label="Topic / task" htmlFor="et"><input id="et" className="input" value={editing.topicTitle} onChange={(e) => setEditing({ ...editing, topicTitle: e.target.value })} /></Field>
            <Field label="Subject" htmlFor="es"><select id="es" className="input" value={editing.subjectId} onChange={(e) => setEditing({ ...editing, subjectId: e.target.value })}>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Date" htmlFor="ed"><input id="ed" type="date" className="input" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
              <Field label="Start" htmlFor="ess"><input id="ess" type="time" className="input" value={editing.start} onChange={(e) => setEditing({ ...editing, start: e.target.value })} /></Field>
              <Field label="End" htmlFor="ee"><input id="ee" type="time" className="input" value={editing.end} onChange={(e) => setEditing({ ...editing, end: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Activity" htmlFor="ea"><select id="ea" className="input" value={editing.activity} onChange={(e) => setEditing({ ...editing, activity: e.target.value as Activity })}><option>Learn</option><option>Practice</option><option>Revision</option></select></Field>
              <Field label="Priority" htmlFor="ep"><select id="ep" className="input" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value as Priority })}><option>High</option><option>Medium</option><option>Low</option></select></Field>
            </div>
            {editErr && <p className="text-sm font-medium text-danger" role="alert">{editErr}</p>}
            <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" onClick={saveEdit}>Save session</button></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={confirm === "generate"} onClose={() => setConfirm(null)} danger={false} title="Replace customised timetable?" confirmLabel="Regenerate" message="You have edited this timetable. Regenerating creates a new draft and your manual edits in the current view will be lost." onConfirm={doGenerate} />
      <ConfirmDialog open={confirm === "save"} onClose={() => setConfirm(null)} danger={false} title="Replace your saved timetable?" confirmLabel="Replace and save" message="Your currently saved timetable contains customisations. Saving this draft will replace it." onConfirm={savePlan} />
    </div>
  );
}
