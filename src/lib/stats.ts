import type { AppData, Subject } from "./types";
import { addDays, daysBetween, todayISO, toISO } from "./utils";

export function subjectProgress(s: Subject): number {
  if (!s.topics.length) return 0;
  return Math.round((s.topics.filter((t) => t.completed).length / s.topics.length) * 100);
}
export function topicTotals(subjects: Subject[]) {
  const total = subjects.reduce((a, s) => a + s.topics.length, 0);
  const done = subjects.reduce((a, s) => a + s.topics.filter((t) => t.completed).length, 0);
  return { total, done, pending: total - done };
}

/** Active study minutes per local date. Timer sessions count their active seconds; manually-ticked plan sessions count planned minutes. */
export function minutesByDate(d: AppData): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of d.focusSessions) {
    const k = toISO(new Date(f.completedAt));
    out[k] = (out[k] || 0) + f.activeSec / 60;
  }
  for (const s of d.plan?.sessions ?? []) {
    if (s.completed && s.completedVia === "manual" && s.completedAt) {
      const k = toISO(new Date(s.completedAt));
      out[k] = (out[k] || 0) + s.durationMin;
    }
  }
  return out;
}
export function minutesBySubject(d: AppData): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of d.focusSessions) if (f.subjectId) out[f.subjectId] = (out[f.subjectId] || 0) + f.activeSec / 60;
  for (const s of d.plan?.sessions ?? [])
    if (s.completed && s.completedVia === "manual") out[s.subjectId] = (out[s.subjectId] || 0) + s.durationMin;
  return out;
}
export function totalMinutes(d: AppData): number {
  return Object.values(minutesByDate(d)).reduce((a, b) => a + b, 0);
}
export function lastNDays(n: number): string[] {
  const t = todayISO();
  return Array.from({ length: n }, (_, i) => addDays(t, i - (n - 1)));
}
export function streak(d: AppData): number {
  const m = minutesByDate(d);
  const t = todayISO();
  let day = (m[t] || 0) > 0 ? t : addDays(t, -1);
  let n = 0;
  while ((m[day] || 0) > 0) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}
export function quizAverage(d: AppData): number | null {
  if (!d.quizAttempts.length) return null;
  return Math.round(d.quizAttempts.reduce((a, q) => a + q.percent, 0) / d.quizAttempts.length);
}
export function nextExam(subjects: Subject[]): { subject: Subject; days: number } | null {
  const t = todayISO();
  const up = subjects
    .filter((s) => s.examDate && daysBetween(t, s.examDate) >= 0)
    .sort((a, b) => a.examDate.localeCompare(b.examDate));
  return up.length ? { subject: up[0], days: daysBetween(t, up[0].examDate) } : null;
}
export function upcomingExams(subjects: Subject[]) {
  const t = todayISO();
  return subjects
    .filter((s) => s.examDate && daysBetween(t, s.examDate) >= 0)
    .sort((a, b) => a.examDate.localeCompare(b.examDate))
    .map((s) => ({ subject: s, days: daysBetween(t, s.examDate) }));
}
export function weeklyGoalMinutes(d: AppData): number {
  const days = d.prefs.studyDays.length || 1;
  return d.prefs.dailyGoalHours * 60 * days;
}
