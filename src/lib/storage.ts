import type { AppData } from "./types";
import { DEFAULT_PREFS, emptyData } from "./defaults";

export const STORAGE_KEY = "studypilot-ai:v1";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);
const list = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v.filter((x) => isObj(x) && typeof x.id === "string") as Record<string, unknown>[]) : [];

/** Defensive: rebuild AppData from untrusted JSON so bad storage never crashes the app. */
export function sanitize(raw: unknown): AppData {
  const base = emptyData();
  if (!isObj(raw)) return base;
  try {
    const prefsRaw = isObj(raw.prefs) ? raw.prefs : {};
    const days = Array.isArray(prefsRaw.studyDays)
      ? (prefsRaw.studyDays as unknown[]).filter((n): n is number => typeof n === "number" && n >= 0 && n <= 6)
      : DEFAULT_PREFS.studyDays;
    base.prefs = {
      name: str(prefsRaw.name),
      dailyGoalHours: Math.min(16, Math.max(0.5, num(prefsRaw.dailyGoalHours, DEFAULT_PREFS.dailyGoalHours))),
      sessionMin: Math.min(180, Math.max(10, num(prefsRaw.sessionMin, DEFAULT_PREFS.sessionMin))),
      breakMin: Math.min(60, Math.max(0, num(prefsRaw.breakMin, DEFAULT_PREFS.breakMin))),
      studyDays: days.length ? days : DEFAULT_PREFS.studyDays,
      theme: prefsRaw.theme === "dark" || prefsRaw.theme === "system" ? prefsRaw.theme : "light",
      startTime: /^\d{2}:\d{2}$/.test(str(prefsRaw.startTime)) ? str(prefsRaw.startTime) : DEFAULT_PREFS.startTime,
      revision: prefsRaw.revision !== false,
    };
    base.subjects = list(raw.subjects)
      .filter((s) => typeof s.name === "string")
      .map((s) => ({
        id: s.id as string,
        name: str(s.name, "Untitled"),
        color: str(s.color, "#2563eb"),
        priority: (["High", "Medium", "Low"].includes(str(s.priority)) ? s.priority : "Medium") as "High",
        confidence: Math.min(5, Math.max(1, Math.round(num(s.confidence, 3)))) as 1,
        examDate: /^\d{4}-\d{2}-\d{2}$/.test(str(s.examDate)) ? str(s.examDate) : "",
        notes: str(s.notes),
        createdAt: str(s.createdAt, new Date().toISOString()),
        topics: list(s.topics).map((t) => ({
          id: t.id as string,
          title: str(t.title, "Topic"),
          completed: t.completed === true,
          completedAt: typeof t.completedAt === "string" ? t.completedAt : undefined,
          estimatedMinutes: Math.min(600, Math.max(10, num(t.estimatedMinutes, 60))),
        })),
      }));
    const plan = raw.plan;
    if (isObj(plan) && Array.isArray(plan.sessions) && isObj(plan.settings)) {
      base.plan = plan as unknown as AppData["plan"];
      base.plan!.sessions = list(plan.sessions) as unknown as NonNullable<AppData["plan"]>["sessions"];
      base.plan!.unscheduled = Array.isArray(plan.unscheduled) ? (plan.unscheduled as never) : [];
      base.plan!.warnings = Array.isArray(plan.warnings) ? (plan.warnings as string[]) : [];
    }
    base.summaries = list(raw.summaries) as unknown as AppData["summaries"];
    base.quizSets = list(raw.quizSets).filter((q) => Array.isArray(q.questions)) as unknown as AppData["quizSets"];
    base.quizAttempts = list(raw.quizAttempts) as unknown as AppData["quizAttempts"];
    base.flashcards = list(raw.flashcards) as unknown as AppData["flashcards"];
    base.focusSessions = list(raw.focusSessions) as unknown as AppData["focusSessions"];
    base.activity = list(raw.activity) as unknown as AppData["activity"];
    base.usingSampleData = raw.usingSampleData === true;
  } catch {
    return emptyData();
  }
  return base;
}

export function loadData(): { data: AppData; error?: string } {
  if (typeof window === "undefined") return { data: emptyData() };
  try {
    const txt = window.localStorage.getItem(STORAGE_KEY);
    if (!txt) return { data: emptyData() };
    return { data: sanitize(JSON.parse(txt)) };
  } catch {
    return { data: emptyData(), error: "Saved data could not be read, so the app started fresh." };
  }
}

export function saveData(data: AppData): string | null {
  if (typeof window === "undefined") return null;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return null;
  } catch {
    return "Your browser blocked saving (storage full or disabled). Changes will be lost on refresh.";
  }
}

export function clearData(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
