"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { BarChart3, Brain, Clock, Flame, Target } from "lucide-react";
import { useStore } from "@/lib/store";
import { lastNDays, minutesByDate, minutesBySubject, quizAverage, streak, topicTotals, totalMinutes, weeklyGoalMinutes } from "@/lib/stats";
import { DAY_NAMES, fmtDate, fmtHours, parseISO, timeAgo } from "@/lib/utils";
import { EmptyState, PageHeader, ProgressBar } from "@/components/ui";

const tip = { borderRadius: 12, border: "1px solid rgb(226 232 240)" };

export default function AnalyticsPage() {
  const { data } = useStore();
  const byDate = minutesByDate(data);
  const bySubject = minutesBySubject(data);
  const days14 = lastNDays(14).map((d) => ({ label: `${parseISO(d).getDate()} ${DAY_NAMES[parseISO(d).getDay()]}`, hours: Math.round(((byDate[d] || 0) / 60) * 100) / 100 }));
  const last7 = lastNDays(7).reduce((a, d) => a + (byDate[d] || 0), 0);
  const goal = weeklyGoalMinutes(data);
  const total = totalMinutes(data);
  const dist = data.subjects.map((s) => ({ name: s.name, value: Math.round((bySubject[s.id] || 0) * 10) / 10, color: s.color })).filter((x) => x.value > 0);
  const { done, pending } = topicTotals(data.subjects);
  const topicBars = data.subjects.map((s) => ({ name: s.name.length > 14 ? s.name.slice(0, 13) + "…" : s.name, Completed: s.topics.filter((t) => t.completed).length, Pending: s.topics.filter((t) => !t.completed).length }));
  const quiz = data.quizAttempts.map((a, i) => ({ n: i + 1, score: a.percent, label: a.topic }));
  const qAvg = quizAverage(data);
  const st = streak(data);
  const hasData = total > 0 || data.quizAttempts.length > 0 || done > 0;

  const recent = [
    ...data.focusSessions.map((f) => ({ id: f.id, text: `Focused ${Math.max(1, Math.round(f.activeSec / 60))} min — ${f.label}`, at: f.completedAt })),
    ...(data.plan?.sessions ?? []).filter((s) => s.completed && s.completedVia === "manual" && s.completedAt).map((s) => ({ id: s.id, text: `Completed planned session — ${s.topicTitle}`, at: s.completedAt! })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

  return (
    <div className="fade-up">
      <PageHeader title="Progress & Analytics" subtitle="Calculated only from your saved subjects, completed sessions and quiz attempts." />
      {!hasData && data.subjects.length === 0 && (
        <div className="card mb-6 p-4"><EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No activity recorded yet" text="Add subjects, finish a focus session or take a quiz and your analytics will appear here. Nothing is pre-filled." action={<Link href="/subjects" className="btn-primary">Add a subject</Link>} /></div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Clock, label: "Total study time", value: `${fmtHours(total)} h`, tone: "bg-teal-soft text-teal" },
          { icon: Flame, label: "Study streak", value: `${st} day${st === 1 ? "" : "s"}`, tone: "bg-warn-soft text-warn" },
          { icon: Brain, label: "Quiz average", value: qAvg === null ? "—" : `${qAvg}%`, tone: "bg-primary-soft text-primary" },
          { icon: Target, label: "Topics done", value: `${done}/${done + pending}`, tone: "bg-violet-soft text-violet" },
        ].map((c) => (
          <div key={c.label} className="card p-4"><div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${c.tone}`}><c.icon className="h-4 w-4" /></div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{c.label}</p><p className="font-display text-2xl font-bold tnum">{c.value}</p></div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="h2">Weekly study goal</h2><span className="text-sm font-semibold tnum">{fmtHours(last7)} / {fmtHours(goal)} h</span></div>
          <ProgressBar value={goal ? (last7 / goal) * 100 : 0} color="#7c3aed" className="h-2.5" />
          <p className="mt-2 text-xs text-muted">Goal = {data.prefs.dailyGoalHours} h × {data.prefs.studyDays.length} study days (change it in Settings). Last 7 days shown.</p>
        </section>

        <section className="card p-5">
          <h2 className="h2 mb-3">Study hours by day (14 days)</h2>
          {total === 0 ? <EmptyState icon={<Clock className="h-5 w-5" />} title="No study time yet" text="Complete a focus session to see daily hours." /> : (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={days14} margin={{ left: -20, right: 8, top: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / 0.25)" /><XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} interval={1} /><YAxis fontSize={11} tickLine={false} axisLine={false} /><Tooltip contentStyle={tip} formatter={(v) => [`${v} h`, "Studied"]} /><Bar dataKey="hours" fill="#2563eb" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="h2 mb-3">Subject-wise distribution</h2>
          {dist.length === 0 ? <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No subject time yet" text="Link focus sessions to a subject to see how your time is split." /> : (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{dist.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip contentStyle={tip} formatter={(v) => [`${v} min`, "Time"]} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer></div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="h2 mb-3">Completed vs pending topics</h2>
          {topicBars.length === 0 ? <EmptyState icon={<Target className="h-5 w-5" />} title="No topics yet" /> : (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={topicBars} margin={{ left: -20, right: 8, top: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / 0.25)" /><XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} /><Tooltip contentStyle={tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="Completed" stackId="a" fill="#0d9488" /><Bar dataKey="Pending" stackId="a" fill="#cbd5e1" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="h2">Quiz scores</h2>{qAvg !== null && <span className="pill-blue">Avg {qAvg}%</span>}</div>
          {quiz.length === 0 ? <EmptyState icon={<Brain className="h-5 w-5" />} title="No quiz attempts yet" text="Take a quiz to chart your scores." action={<Link href="/quiz" className="btn-secondary btn-sm">Take a quiz</Link>} /> : (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={quiz} margin={{ left: -20, right: 12, top: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / 0.25)" /><XAxis dataKey="n" fontSize={11} tickLine={false} axisLine={false} label={{ value: "Attempt", position: "insideBottom", offset: -2, fontSize: 11 }} /><YAxis domain={[0, 100]} fontSize={11} tickLine={false} axisLine={false} /><Tooltip contentStyle={tip} formatter={(v) => [`${v}%`, "Score"]} labelFormatter={(n) => `Attempt ${n}`} /><Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="h2 mb-3">Recent study activities</h2>
          {recent.length === 0 ? <EmptyState icon={<Clock className="h-5 w-5" />} title="No study activity yet" /> : (
            <ul className="space-y-2.5">{recent.map((r) => <li key={r.id} className="flex items-start gap-2 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /><span className="min-w-0 flex-1 break-words">{r.text}</span><span className="shrink-0 text-xs text-muted">{timeAgo(r.at)}</span></li>)}</ul>
          )}
        </section>
      </div>
      <p className="mt-6 text-xs text-muted">Study time = completed focus-timer minutes + planned sessions you ticked off manually. Last updated {fmtDate(new Date().toISOString().slice(0, 10))}.</p>
    </div>
  );
}
