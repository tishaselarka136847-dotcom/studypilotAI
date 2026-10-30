import type { Activity, PlanSettings, Priority, StudyPlan, StudySession, Subject, UnscheduledItem } from "./types";
import { addDays, daysBetween, fromMin, toMin, uid, weekday } from "./utils";

/**
 * Client-side study scheduler (no AI involved — a deterministic greedy / earliest-deadline-first
 * algorithm weighted by confidence and subject priority).
 *
 * Guarantees:
 *  - study minutes per day never exceed settings.dailyHours * 60
 *  - sessions on a day never overlap and are separated by breakMin
 *  - nothing is scheduled on or after the subject's exam date
 *  - anything that cannot fit is reported in `unscheduled` (never silently dropped / over-packed)
 */

const MIN_CHUNK = 15; // never create a session shorter than this unless the task itself is shorter
const DAY_END = 23 * 60; // no session may end after 23:00
const DEFAULT_HORIZON = 28; // days to plan for subjects without an exam date
const MAX_HORIZON = 150;

interface Unit {
  key: string;
  subject: Subject;
  topicId?: string;
  topicTitle: string;
  activity: Activity;
  remaining: number;
  deadline: string; // last allowed study date (inclusive)
  weight: number;
  revisionOf?: string; // subject id whose learn units must be done first
}

const PRIORITY_W: Record<Priority, number> = { High: 1, Medium: 0.7, Low: 0.45 };

function roundTo5(n: number) {
  return Math.max(10, Math.round(n / 5) * 5);
}

export function sessionPriority(subject: Subject, date: string): Priority {
  let score = PRIORITY_W[subject.priority] + (5 - subject.confidence) * 0.1;
  if (subject.examDate) {
    const left = daysBetween(date, subject.examDate);
    if (left <= 7) score += 0.4;
    else if (left <= 14) score += 0.15;
  }
  return score >= 1.15 ? "High" : score >= 0.75 ? "Medium" : "Low";
}

export function generatePlan(subjects: Subject[], settings: PlanSettings, nowMinutes?: number): StudyPlan {
  const warnings: string[] = [];
  const unscheduled: UnscheduledItem[] = [];
  const sessions: StudySession[] = [];
  const { startDate, sessionMin, breakMin } = settings;
  const dailyLimit = Math.round(settings.dailyHours * 60);

  const chosen = subjects.filter((s) => settings.subjectIds.includes(s.id));
  const studyDays = new Set(settings.studyDays);

  if (!chosen.length) warnings.push("No subjects were selected for this plan.");
  if (!studyDays.size) warnings.push("No study days are selected, so nothing could be scheduled.");

  // ---- Build work units ----
  const units: Unit[] = [];
  const horizonEnd = addDays(startDate, DEFAULT_HORIZON - 1);
  for (const s of chosen) {
    const pending = s.topics.filter((t) => !t.completed);
    if (!pending.length) continue;
    const examOk = !s.examDate || daysBetween(startDate, s.examDate) > 0;
    const deadline = s.examDate ? addDays(s.examDate, -1) : horizonEnd;
    const confW = (6 - s.confidence) / 5;
    const weight = 0.6 * confW + 0.4 * PRIORITY_W[s.priority];
    const activity: Activity = s.confidence >= 4 ? "Practice" : "Learn";

    for (const t of pending) {
      const minutes = roundTo5(t.estimatedMinutes * (1 + (5 - s.confidence) * 0.1));
      if (!examOk) {
        unscheduled.push({
          subjectId: s.id,
          topicId: t.id,
          topicTitle: t.title,
          activity,
          minutesLeft: minutes,
          reason: "Exam date is today or already passed",
        });
        continue;
      }
      units.push({ key: `${s.id}:${t.id}`, subject: s, topicId: t.id, topicTitle: t.title, activity, remaining: minutes, deadline, weight });
    }

    if (settings.revision && examOk) {
      const n = Math.min(4, Math.max(1, Math.ceil(pending.length / 3)));
      for (let i = 0; i < n; i++) {
        const slice = pending.filter((_, idx) => idx % n === i).slice(0, 3);
        units.push({
          key: `${s.id}:rev${i}`,
          subject: s,
          topicTitle: `Revise: ${slice.map((t) => t.title).join(", ") || s.name}`,
          activity: "Revision",
          remaining: Math.min(sessionMin, 45),
          deadline,
          weight: weight * 0.9,
          revisionOf: s.id,
        });
      }
    }
  }

  // ---- Planning window ----
  let lastDay = startDate;
  for (const u of units) if (u.deadline > lastDay) lastDay = u.deadline;
  if (daysBetween(startDate, lastDay) > MAX_HORIZON) lastDay = addDays(startDate, MAX_HORIZON);

  const learnLeft = (subjectId: string) =>
    units.some((u) => u.subject.id === subjectId && u.activity !== "Revision" && u.remaining > 0);

  // ---- Day-by-day allocation ----
  if (studyDays.size && units.length) {
    const total = daysBetween(startDate, lastDay);
    for (let i = 0; i <= total; i++) {
      const day = addDays(startDate, i);
      if (!studyDays.has(weekday(day))) continue;
      let capacity = dailyLimit;
      let cursor = toMin(settings.startTime);
      if (i === 0 && nowMinutes !== undefined) cursor = Math.max(cursor, Math.ceil(nowMinutes / 5) * 5);
      let placed = 0;
      let prevSubject = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const ready = units.filter(
          (u) => u.remaining > 0 && u.deadline >= day && (!u.revisionOf || !learnLeft(u.revisionOf))
        );
        if (!ready.length || capacity < MIN_CHUNK) break;

        let best: Unit | null = null;
        let bestScore = -Infinity;
        for (const u of ready) {
          const daysLeft = Math.max(0, daysBetween(day, u.deadline));
          const urgency = 1 / (daysLeft + 1);
          const score = urgency * 2 + u.weight - (u.subject.id === prevSubject ? 0.25 : 0) - (u.activity === "Revision" ? 0.05 : 0);
          if (score > bestScore) {
            bestScore = score;
            best = u;
          }
        }
        if (!best) break;

        const startAt = cursor + (placed > 0 ? breakMin : 0);
        const room = DAY_END - startAt;
        const duration = Math.min(sessionMin, best.remaining, capacity, room);
        if (duration < Math.min(MIN_CHUNK, best.remaining)) break; // not enough room today

        sessions.push({
          id: uid("ses"),
          subjectId: best.subject.id,
          topicId: best.topicId,
          topicTitle: best.topicTitle,
          activity: best.activity,
          date: day,
          start: fromMin(startAt),
          end: fromMin(startAt + duration),
          durationMin: duration,
          priority: sessionPriority(best.subject, day),
          completed: false,
        });
        best.remaining -= duration;
        capacity -= duration;
        cursor = startAt + duration;
        placed++;
        prevSubject = best.subject.id;
      }
    }
  }

  // ---- Anything left over could not be scheduled ----
  for (const u of units) {
    if (u.remaining <= 0) continue;
    const startPast = u.deadline < startDate;
    unscheduled.push({
      subjectId: u.subject.id,
      topicId: u.topicId,
      topicTitle: u.topicTitle,
      activity: u.activity,
      minutesLeft: u.remaining,
      reason: startPast
        ? "No study time before the exam date"
        : u.subject.examDate
        ? `Not enough available study time before ${u.subject.examDate}`
        : "Not enough available study time in the planning window",
    });
  }

  if (unscheduled.length) {
    const mins = unscheduled.reduce((a, b) => a + b.minutesLeft, 0);
    warnings.unshift(
      `${unscheduled.length} item${unscheduled.length > 1 ? "s" : ""} (about ${Math.round((mins / 60) * 10) / 10} h) could not fit into your available time. ` +
        `Try more daily hours, more study days, shorter breaks, or review your exam dates.`
    );
  }

  sessions.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  return {
    id: uid("plan"),
    createdAt: new Date().toISOString(),
    customized: false,
    settings,
    sessions,
    unscheduled,
    warnings,
  };
}

/** Independent validator used by the self-test and by the UI after manual edits. */
export function findProblems(sessions: StudySession[], dailyHours: number, subjects: Subject[]): string[] {
  const problems: string[] = [];
  const byDay: Record<string, StudySession[]> = {};
  for (const s of sessions) (byDay[s.date] ||= []).push(s);
  for (const [day, list] of Object.entries(byDay)) {
    const sorted = [...list].sort((a, b) => toMin(a.start) - toMin(b.start));
    let total = 0;
    sorted.forEach((s, i) => {
      total += s.durationMin;
      if (toMin(s.end) - toMin(s.start) !== s.durationMin) problems.push(`${day}: duration mismatch`);
      if (i > 0 && toMin(s.start) < toMin(sorted[i - 1].end)) problems.push(`${day}: overlap at ${s.start}`);
      const sub = subjects.find((x) => x.id === s.subjectId);
      if (sub?.examDate && s.date >= sub.examDate) problems.push(`${day}: ${sub.name} scheduled on/after exam`);
    });
    if (total > dailyHours * 60) problems.push(`${day}: ${total} min exceeds daily limit`);
  }
  return problems;
}
