"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BookOpen, Brain, CalendarCheck, CheckCircle2, Circle, Clock, FileText, ListChecks, Sparkles, Timer, Wand2, ArrowRight, GraduationCap, Database } from "lucide-react";
import { useStore } from "@/lib/store";
import { sampleData } from "@/lib/sample";
import { minutesByDate, lastNDays, quizAverage, subjectProgress, topicTotals, totalMinutes, upcomingExams, streak } from "@/lib/stats";
import { DAY_NAMES, fmtDate, fmtHours, parseISO, timeAgo, todayISO } from "@/lib/utils";
import { EmptyState, ProgressBar, Ring, SubjectDot } from "@/components/ui";

export default function Dashboard() {
  const { data, update, toast } = useStore();
  const router = useRouter();
  const t = todayISO();
  const { total, done } = topicTotals(data.subjects);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const mins = totalMinutes(data);
  const qAvg = quizAverage(data);
  const exams = upcomingExams(data.subjects);
  const byDate = minutesByDate(data);
  const week = lastNDays(7).map((d) => ({ day: DAY_NAMES[parseISO(d).getDay()], hours: Math.round(((byDate[d] || 0) / 60) * 100) / 100, isToday: d === t }));
  const weekHours = week.reduce((a, b) => a + b.hours, 0);
  const todays = (data.plan?.sessions ?? []).filter((s) => s.date === t).sort((a, b) => a.start.localeCompare(b.start));
  const name = data.prefs.name.trim();
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const urgent = exams[0];
  const subjById = (id: string) => data.subjects.find((s) => s.id === id);

  const toggleSession = (id: string) =>
    update((d) =>
      d.plan
        ? {
            ...d,
            plan: {
              ...d.plan,
              sessions: d.plan.sessions.map((s) =>
                s.id === id
                  ? s.completed
                    ? { ...s, completed: false, completedAt: undefined, completedVia: undefined }
                    : { ...s, completed: true, completedAt: new Date().toISOString(), completedVia: "manual" as const }
                  : s
              ),
            },
          }
        : d
    );

  const loadSample = () => {
    update((d) => sampleData(d));
    toast("Sample demonstration data loaded. You can remove it in Settings.", "info");
  };

  const stat = [
    { label: "Subjects Added", value: String(data.subjects.length), sub: `${total} topics tracked`, icon: BookOpen, tone: "bg-primary-soft text-primary" },
    { label: "Study Hours Completed", value: `${fmtHours(mins)} hrs`, sub: mins ? `${streak(data)}-day streak` : "Complete a focus session to start", icon: Clock, tone: "bg-teal-soft text-teal" },
    { label: "Topics Completed", value: `${done}`, sub: `of ${total} topics`, icon: CheckCircle2, tone: "bg-violet-soft text-violet", ring: true },
    { label: "Quiz Average", value: qAvg === null ? "—" : `${qAvg}%`, sub: qAvg === null ? "No quizzes taken yet" : `across ${data.quizAttempts.length} quiz${data.quizAttempts.length > 1 ? "zes" : ""}`, icon: Brain, tone: "bg-primary-soft text-primary" },
  ];

  const quick = [
    { title: "Generate Study Plan", text: "Build a timetable from your subjects, exam dates and available hours.", href: "/planner", icon: Wand2, cta: "Open planner", tone: "bg-violet-soft text-violet" },
    { title: "Summarize Notes", text: "Paste notes to get key points and a revision list (demo text processing).", href: "/notes", icon: FileText, cta: "Paste notes", tone: "bg-primary-soft text-primary" },
    { title: "Generate Quiz", text: "Practice with sample questions or build your own question sets.", href: "/quiz", icon: Brain, cta: "Create quiz", tone: "bg-teal-soft text-teal" },
    { title: "Start Focus Session", text: "Countdown timer that only counts the minutes you actually study.", href: "/focus", icon: Timer, cta: "Enter focus mode", tone: "bg-surface-high text-ink" },
  ];

  return (
    <div className="fade-up space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="h1">{greet}{name ? `, ${name}` : ""}! 🚀</h1>
            {data.usingSampleData && <span className="pill-gray uppercase tracking-wider">Demo data</span>}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {urgent ? <>Your next exam is <b className="text-ink">{urgent.subject.name}</b> {urgent.days === 0 ? "today" : `in ${urgent.days} day${urgent.days > 1 ? "s" : ""}`}. {todays.length ? `You have ${todays.filter((s) => !s.completed).length} study task(s) left today.` : "Generate a plan to schedule your revision."}</> : "Add your subjects and exam dates to get a personalised plan."}
          </p>
        </div>
      </div>

      {data.subjects.length === 0 && (
        <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-soft p-2.5 text-violet"><GraduationCap className="h-5 w-5" /></div>
            <div>
              <p className="font-display font-semibold">Welcome to StudyPilot AI</p>
              <p className="text-sm text-muted">Your dashboard is empty because no data is saved in this browser yet. Add your own subjects, or explore with optional sample data.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/subjects" className="btn-primary">Add a subject</Link>
            <button className="btn-secondary" onClick={loadSample}><Database className="h-4 w-4" /> Load sample data</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat.map((s) => (
          <div key={s.label} className="card flex items-start justify-between gap-3 p-4 transition-shadow hover:shadow-pop">
            <div className="min-w-0">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${s.tone}`}><s.icon className="h-5 w-5" /></div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{s.label}</p>
              <p className="font-display text-2xl font-bold tnum">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted">{s.sub}</p>
            </div>
            {s.ring && <Ring value={pct} size={72} stroke={6}><span className="text-sm">{pct}%</span></Ring>}
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-surface-container via-surface-low to-surface-low p-5 shadow-card sm:p-6">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="pill-ai mb-2"><Sparkles className="h-3 w-3" /> Smart schedule · AI Demo Mode</span>
            <h2 className="font-display text-xl font-bold sm:text-2xl">Let&apos;s create a study plan that works for you.</h2>
            <p className="mt-1 text-sm text-muted">The scheduler runs entirely in your browser. It weighs exam dates, confidence and priority, respects your daily hour limit and warns you when the syllabus won&apos;t fit.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-primary h-11" onClick={() => router.push("/planner")}><Wand2 className="h-4 w-4" /> Generate My Study Plan</button>
            <Link href="/planner" className="btn-ghost h-11">View Timetable <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>

      <section aria-labelledby="qa">
        <h2 id="qa" className="h2 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quick.map((q) => (
            <Link key={q.title} href={q.href} className="card group flex flex-col justify-between p-4 transition-all hover:-translate-y-0.5 hover:shadow-pop">
              <div>
                <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${q.tone}`}><q.icon className="h-5 w-5" /></div>
                <h3 className="font-display font-semibold">{q.title}</h3>
                <p className="mt-1 text-sm text-muted">{q.text}</p>
              </div>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">{q.cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="h2">Weekly Study Activity</h2>
                <p className="text-sm text-muted">Active study hours over the last 7 days</p>
              </div>
              <span className="text-sm font-semibold tnum">{Math.round(weekHours * 10) / 10}h total</span>
            </div>
            {weekHours === 0 ? (
              <EmptyState icon={<Clock className="h-5 w-5" />} title="No study time recorded yet" text="Finish a focus session or tick off a planned session and it will show up here." action={<Link href="/focus" className="btn-primary btn-sm">Start a focus session</Link>} />
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={week} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / 0.25)" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "rgb(148 163 184 / 0.12)" }} formatter={(v) => [`${v} h`, "Studied"]} contentStyle={{ borderRadius: 12, border: "1px solid rgb(226 232 240)" }} />
                    <ReferenceLine y={data.prefs.dailyGoalHours} stroke="#7c3aed" strokeDasharray="4 4" label={{ value: `Goal ${data.prefs.dailyGoalHours}h`, fontSize: 11, fill: "#7c3aed", position: "insideTopRight" }} />
                    <Bar dataKey="hours" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="h2">Today&apos;s Study Tasks</h2>
                <p className="text-sm text-muted">{fmtDate(t, { weekday: "long", day: "numeric", month: "long" })}</p>
              </div>
              <Link href="/planner" className="text-sm font-semibold text-primary">Timetable</Link>
            </div>
            {todays.length === 0 ? (
              <EmptyState icon={<ListChecks className="h-5 w-5" />} title="Nothing scheduled for today" text={data.plan ? "Your saved plan has no sessions today." : "Generate a study plan to get daily tasks."} action={<Link href="/planner" className="btn-primary btn-sm">Generate plan</Link>} />
            ) : (
              <ul className="divide-y divide-line">
                {todays.map((s) => {
                  const sub = subjById(s.subjectId);
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-3">
                      <button aria-label={s.completed ? "Mark as pending" : "Mark as completed"} aria-pressed={s.completed} onClick={() => toggleSession(s.id)}>
                        {s.completed ? <CheckCircle2 className="h-5 w-5 text-teal" /> : <Circle className="h-5 w-5 text-muted" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${s.completed ? "text-muted line-through" : ""}`}>{s.topicTitle}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted"><SubjectDot color={sub?.color ?? "#94a3b8"} /> {sub?.name ?? "Subject"} · {s.start}–{s.end}</p>
                      </div>
                      {!s.completed && <Link href={`/focus?session=${s.id}`} className="btn-primary btn-sm">Start</Link>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <section className="card p-5">
            <h2 className="h2 mb-3">Upcoming Exams</h2>
            {exams.length === 0 ? (
              <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="No upcoming exams" text="Set an exam date on a subject to see it here." action={<Link href="/subjects" className="btn-secondary btn-sm">Go to subjects</Link>} />
            ) : (
              <ul className="space-y-3">
                {exams.slice(0, 5).map(({ subject, days }) => (
                  <li key={subject.id} className="rounded-xl border border-line p-3" style={{ borderLeft: `4px solid ${subject.color}` }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{subject.name}</p>
                      <span className={days <= 7 ? "pill-red" : "pill-gray"}>{days === 0 ? "Today" : `In ${days} day${days > 1 ? "s" : ""}`}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{fmtDate(subject.examDate)} · {subject.priority} priority · {subjectProgress(subject)}% syllabus done</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="h2 mb-3">Subject Progress</h2>
            {data.subjects.length === 0 ? (
              <p className="text-sm text-muted">Progress appears here once you add subjects and topics.</p>
            ) : (
              <ul className="space-y-3">
                {data.subjects.map((s) => (
                  <li key={s.id}>
                    <div className="mb-1 flex justify-between text-sm"><span className="flex min-w-0 items-center gap-2 truncate font-medium"><SubjectDot color={s.color} />{s.name}</span><span className="tnum font-semibold">{subjectProgress(s)}%</span></div>
                    <ProgressBar value={subjectProgress(s)} color={s.color} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="h2 mb-3">Recent Activities</h2>
            {data.activity.length === 0 ? (
              <p className="text-sm text-muted">No activity yet. Actions you take will be listed here.</p>
            ) : (
              <ul className="space-y-2.5">
                {data.activity.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="min-w-0 flex-1 break-words">{a.text}</span>
                    <span className="shrink-0 text-xs text-muted">{timeAgo(a.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
