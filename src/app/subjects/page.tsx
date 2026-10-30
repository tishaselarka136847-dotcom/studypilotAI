"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, CheckCircle2, Circle, Pencil, Plus, Search, Trash2, ListPlus, Database } from "lucide-react";
import { useStore, withLog } from "@/lib/store";
import { sampleData } from "@/lib/sample";
import { subjectProgress } from "@/lib/stats";
import type { Priority, Subject, Topic } from "@/lib/types";
import { SUBJECT_COLORS, cn, daysBetween, fmtDate, todayISO, uid } from "@/lib/utils";
import { ConfirmDialog, EmptyState, Field, Modal, PageHeader, ProgressBar, Segmented, SubjectDot } from "@/components/ui";

interface Draft {
  id?: string;
  name: string;
  color: string;
  priority: Priority;
  confidence: 1 | 2 | 3 | 4 | 5;
  examDate: string;
  notes: string;
}
const blank = (n: number): Draft => ({ name: "", color: SUBJECT_COLORS[n % SUBJECT_COLORS.length], priority: "Medium", confidence: 3, examDate: "", notes: "" });
const CONF = ["Very low", "Low", "Medium", "Good", "Strong"];

export default function SubjectsPage() {
  const { data, update, toast } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | Priority | "Upcoming">("All");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [delSubject, setDelSubject] = useState<Subject | null>(null);
  const [delTopic, setDelTopic] = useState<{ sid: string; topic: Topic } | null>(null);
  const [topicEdit, setTopicEdit] = useState<{ sid: string; id?: string; title: string; minutes: number } | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [newMin, setNewMin] = useState(60);
  const [topicErr, setTopicErr] = useState("");

  useEffect(() => {
    const open = new URLSearchParams(window.location.search).get("open");
    if (open) setSelected(open);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.subjects.filter((s) => {
      if (q && !(s.name.toLowerCase().includes(q) || s.topics.some((t) => t.title.toLowerCase().includes(q)))) return false;
      if (filter === "Upcoming") return !!s.examDate && daysBetween(todayISO(), s.examDate) >= 0;
      if (filter !== "All") return s.priority === filter;
      return true;
    });
  }, [data.subjects, query, filter]);

  const current = data.subjects.find((s) => s.id === selected) ?? null;

  const mutateSubject = (id: string, fn: (s: Subject) => Subject) => update((d) => ({ ...d, subjects: d.subjects.map((s) => (s.id === id ? fn(s) : s)) }));

  const saveSubject = () => {
    if (!draft) return;
    const e: Record<string, string> = {};
    const name = draft.name.trim();
    if (!name) e.name = "Please enter a subject name.";
    else if (name.length > 60) e.name = "Keep the name under 60 characters.";
    else if (data.subjects.some((s) => s.id !== draft.id && s.name.toLowerCase() === name.toLowerCase())) e.name = "A subject with this name already exists.";
    if (draft.examDate && isNaN(new Date(draft.examDate).getTime())) e.exam = "Enter a valid date.";
    setErr(e);
    if (Object.keys(e).length) return;
    if (draft.id) {
      mutateSubject(draft.id, (s) => ({ ...s, name, color: draft.color, priority: draft.priority, confidence: draft.confidence, examDate: draft.examDate, notes: draft.notes }));
      update((d) => withLog(d, "subject", `Updated subject “${name}”`));
      toast("Subject updated");
    } else {
      const s: Subject = { id: uid("sub"), name, color: draft.color, priority: draft.priority, confidence: draft.confidence, examDate: draft.examDate, notes: draft.notes, topics: [], createdAt: new Date().toISOString() };
      update((d) => withLog({ ...d, subjects: [...d.subjects, s] }, "subject", `Added subject “${name}”`));
      setSelected(s.id);
      toast("Subject added");
    }
    setDraft(null);
  };

  const removeSubject = (s: Subject) => {
    update((d) =>
      withLog(
        {
          ...d,
          subjects: d.subjects.filter((x) => x.id !== s.id),
          flashcards: d.flashcards.filter((f) => f.subjectId !== s.id),
          plan: d.plan ? { ...d.plan, sessions: d.plan.sessions.filter((x) => x.subjectId !== s.id), unscheduled: d.plan.unscheduled.filter((x) => x.subjectId !== s.id) } : null,
        },
        "subject",
        `Deleted subject “${s.name}”`
      )
    );
    if (selected === s.id) setSelected(null);
    toast("Subject deleted");
  };

  const addTopic = () => {
    if (!current) return;
    const title = newTopic.trim();
    if (!title) return setTopicErr("Enter a topic name.");
    if (current.topics.some((t) => t.title.toLowerCase() === title.toLowerCase())) return setTopicErr("This topic already exists.");
    setTopicErr("");
    mutateSubject(current.id, (s) => ({ ...s, topics: [...s.topics, { id: uid("top"), title, completed: false, estimatedMinutes: newMin }] }));
    update((d) => withLog(d, "topic", `Added topic “${title}” to ${current.name}`));
    setNewTopic("");
  };

  const toggleTopic = (sid: string, tid: string) => {
    const s = data.subjects.find((x) => x.id === sid);
    const t = s?.topics.find((x) => x.id === tid);
    if (!s || !t) return;
    mutateSubject(sid, (sub) => ({ ...sub, topics: sub.topics.map((x) => (x.id === tid ? { ...x, completed: !x.completed, completedAt: !x.completed ? new Date().toISOString() : undefined } : x)) }));
    update((d) => withLog(d, "topic", `${t.completed ? "Reopened" : "Completed"} “${t.title}” (${s.name})`));
  };

  const saveTopicEdit = () => {
    if (!topicEdit) return;
    const title = topicEdit.title.trim();
    if (!title) return setTopicErr("Topic name is required.");
    setTopicErr("");
    mutateSubject(topicEdit.sid, (s) => ({ ...s, topics: s.topics.map((t) => (t.id === topicEdit.id ? { ...t, title, estimatedMinutes: topicEdit.minutes } : t)) }));
    setTopicEdit(null);
    toast("Topic updated");
  };

  const removeTopic = (sid: string, t: Topic) => {
    mutateSubject(sid, (s) => ({ ...s, topics: s.topics.filter((x) => x.id !== t.id) }));
    update((d) => ({
      ...d,
      plan: d.plan ? { ...d.plan, sessions: d.plan.sessions.filter((x) => x.topicId !== t.id) } : null,
    }));
    toast("Topic deleted");
  };

  return (
    <div className="fade-up">
      <PageHeader
        title="My Subjects & Syllabus"
        subtitle="Track every subject, its topics, exam date and confidence. Progress updates automatically as you complete topics."
        actions={
          <button className="btn-primary" onClick={() => { setErr({}); setDraft(blank(data.subjects.length)); }}>
            <Plus className="h-4 w-4" /> Add Subject
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-card px-3">
          <Search className="h-4 w-4 text-muted" />
          <input aria-label="Search subjects and topics" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subjects or topics…" className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted" />
        </div>
        <Segmented<typeof filter> label="Filter subjects" value={filter} onChange={setFilter} options={[{ value: "All", label: "All" }, { value: "High", label: "High" }, { value: "Medium", label: "Medium" }, { value: "Low", label: "Low" }, { value: "Upcoming", label: "Upcoming exam" }]} />
      </div>

      {data.subjects.length === 0 ? (
        <div className="card p-4">
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No subjects yet" text="Add your first subject to start tracking topics, or load the optional demonstration dataset." action={<>
            <button className="btn-primary" onClick={() => { setErr({}); setDraft(blank(0)); }}><Plus className="h-4 w-4" /> Add Subject</button>
            <button className="btn-secondary" onClick={() => { update((d) => sampleData(d)); toast("Sample data loaded", "info"); }}><Database className="h-4 w-4" /> Load sample data</button>
          </>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-5">
            {filtered.length === 0 && <div className="card p-4"><EmptyState icon={<Search className="h-5 w-5" />} title="No matching subjects" text="Try a different search or filter." /></div>}
            {filtered.map((s) => {
              const days = s.examDate ? daysBetween(todayISO(), s.examDate) : null;
              const active = selected === s.id;
              return (
                <button key={s.id} onClick={() => setSelected(s.id)} aria-pressed={active} className={cn("card block w-full p-4 text-left transition-all hover:shadow-pop", active && "ring-2 ring-primary")} style={{ borderLeft: `4px solid ${s.color}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display font-semibold">{s.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{s.topics.filter((t) => t.completed).length}/{s.topics.length} topics · Confidence: {CONF[s.confidence - 1]}</p>
                    </div>
                    <span className={s.priority === "High" ? "pill-red" : s.priority === "Medium" ? "pill-amber" : "pill-gray"}>{s.priority}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={subjectProgress(s)} color={s.color} />
                    <span className="text-sm font-semibold tnum">{subjectProgress(s)}%</span>
                  </div>
                  {days !== null && <p className={cn("mt-2 flex items-center gap-1 text-xs", days < 0 ? "text-muted" : days <= 7 ? "font-semibold text-danger" : "text-muted")}><CalendarDays className="h-3.5 w-3.5" /> {days < 0 ? `Exam passed (${fmtDate(s.examDate)})` : days === 0 ? "Exam today" : `Exam ${fmtDate(s.examDate)} · ${days} days left`}</p>}
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7">
            {!current ? (
              <div className="card p-4"><EmptyState icon={<ListPlus className="h-6 w-6" />} title="Select a subject" text="Choose a subject on the left to manage its syllabus topics and notes." /></div>
            ) : (
              <div className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-display text-xl font-bold"><SubjectDot color={current.color} className="h-3 w-3" /> <span className="break-words">{current.name}</span></p>
                    <p className="text-sm text-muted">Exam: {fmtDate(current.examDate)} · Priority: {current.priority} · Confidence: {CONF[current.confidence - 1]}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary btn-sm" onClick={() => { setErr({}); setDraft({ id: current.id, name: current.name, color: current.color, priority: current.priority, confidence: current.confidence, examDate: current.examDate, notes: current.notes }); }}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                    <button className="btn-secondary btn-sm text-danger" onClick={() => setDelSubject(current)}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={subjectProgress(current)} color={current.color} className="h-2" />
                  <span className="font-display font-bold tnum">{subjectProgress(current)}%</span>
                </div>

                <h3 className="h2 mb-2 mt-6">Syllabus topics</h3>
                {current.topics.length === 0 ? (
                  <EmptyState icon={<ListPlus className="h-5 w-5" />} title="No topics yet" text="Add the chapters or topics you need to cover." />
                ) : (
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {current.topics.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 px-3 py-2.5">
                        <button aria-label={t.completed ? `Mark ${t.title} pending` : `Mark ${t.title} complete`} aria-pressed={t.completed} onClick={() => toggleTopic(current.id, t.id)}>
                          {t.completed ? <CheckCircle2 className="h-5 w-5 text-teal" /> : <Circle className="h-5 w-5 text-muted" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={cn("break-words text-sm font-medium", t.completed && "text-muted line-through")}>{t.title}</p>
                          <p className="text-xs text-muted">~{t.estimatedMinutes} min</p>
                        </div>
                        <button aria-label={`Edit ${t.title}`} className="rounded-lg p-1.5 text-muted hover:bg-surface-low" onClick={() => { setTopicErr(""); setTopicEdit({ sid: current.id, id: t.id, title: t.title, minutes: t.estimatedMinutes }); }}><Pencil className="h-4 w-4" /></button>
                        <button aria-label={`Delete ${t.title}`} className="rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger" onClick={() => setDelTopic({ sid: current.id, topic: t })}><Trash2 className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input aria-label="New topic name" className="input flex-1" placeholder="Add a topic, e.g. Binary Trees" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTopic()} />
                  <select aria-label="Estimated minutes" className="input sm:w-32" value={newMin} onChange={(e) => setNewMin(Number(e.target.value))}>
                    {[30, 45, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{m} min</option>)}
                  </select>
                  <button className="btn-primary" onClick={addTopic}><Plus className="h-4 w-4" /> Add</button>
                </div>
                {topicErr && !topicEdit && <p className="mt-1 text-xs font-medium text-danger" role="alert">{topicErr}</p>}

                <h3 className="h2 mb-2 mt-6">Subject notes</h3>
                <textarea aria-label="Subject notes" className="input min-h-[96px]" placeholder="Write quick notes about this subject (saved automatically)…" value={current.notes} onChange={(e) => mutateSubject(current.id, (s) => ({ ...s, notes: e.target.value }))} />
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Edit subject" : "Add subject"}>
        {draft && (
          <div className="space-y-4">
            <Field label="Subject name" error={err.name} htmlFor="sn"><input id="sn" className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Data Structures" maxLength={80} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Exam date" error={err.exam} htmlFor="sd"><input id="sd" type="date" className="input" value={draft.examDate} onChange={(e) => setDraft({ ...draft, examDate: e.target.value })} /></Field>
              <Field label="Priority" htmlFor="sp">
                <select id="sp" className="input" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}><option>High</option><option>Medium</option><option>Low</option></select>
              </Field>
            </div>
            <Field label={`Confidence: ${CONF[draft.confidence - 1]} (${draft.confidence}/5)`} htmlFor="sc">
              <input id="sc" type="range" min={1} max={5} step={1} className="w-full accent-primary" value={draft.confidence} onChange={(e) => setDraft({ ...draft, confidence: Number(e.target.value) as 1 })} />
            </Field>
            <Field label="Colour">
              <div className="flex flex-wrap gap-2">
                {SUBJECT_COLORS.map((c) => (
                  <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={draft.color === c} onClick={() => setDraft({ ...draft, color: c })} className={cn("h-7 w-7 rounded-full ring-offset-2 ring-offset-card", draft.color === c && "ring-2 ring-ink")} style={{ background: c }} />
                ))}
              </div>
            </Field>
            <Field label="Notes (optional)" htmlFor="snotes"><textarea id="snotes" className="input min-h-[72px]" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setDraft(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveSubject}>{draft.id ? "Save changes" : "Add subject"}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!topicEdit} onClose={() => setTopicEdit(null)} title="Edit topic">
        {topicEdit && (
          <div className="space-y-4">
            <Field label="Topic name" error={topicErr}><input className="input" value={topicEdit.title} onChange={(e) => setTopicEdit({ ...topicEdit, title: e.target.value })} /></Field>
            <Field label="Estimated study time">
              <select className="input" value={topicEdit.minutes} onChange={(e) => setTopicEdit({ ...topicEdit, minutes: Number(e.target.value) })}>{[30, 45, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
            </Field>
            <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => setTopicEdit(null)}>Cancel</button><button className="btn-primary" onClick={saveTopicEdit}>Save</button></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!delSubject} onClose={() => setDelSubject(null)} title="Delete subject?" confirmLabel="Delete subject" message={<>This removes <b>{delSubject?.name}</b>, its topics, flashcards and any planned sessions. This cannot be undone.</>} onConfirm={() => delSubject && removeSubject(delSubject)} />
      <ConfirmDialog open={!!delTopic} onClose={() => setDelTopic(null)} title="Delete topic?" confirmLabel="Delete topic" message={<>Delete <b>{delTopic?.topic.title}</b> and its planned sessions?</>} onConfirm={() => delTopic && removeTopic(delTopic.sid, delTopic.topic)} />
    </div>
  );
}
