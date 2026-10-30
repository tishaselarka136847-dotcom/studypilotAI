"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useStore, withLog } from "./store";
import { uid } from "./utils";

export type TimerStatus = "idle" | "running" | "paused" | "done";
export interface TimerConfig {
  label: string;
  subjectId?: string;
  planSessionId?: string;
  minutes: number;
}
interface TimerCtx {
  status: TimerStatus;
  config: TimerConfig;
  remainingSec: number;
  plannedSec: number;
  configure: (c: Partial<TimerConfig>) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

const Ctx = createContext<TimerCtx | null>(null);
export const useTimer = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTimer outside provider");
  return c;
};

/**
 * Timer is wall-clock based (Date.now), so it stays accurate when the tab is throttled.
 * Only time while status === "running" is counted: paused time is never added to `accumulatedMs`.
 * A completion is recorded exactly once per run (guarded by `finishedRun`).
 */
export function TimerProvider({ children }: { children: ReactNode }) {
  const { update, toast, data } = useStore();
  const [config, setConfig] = useState<TimerConfig>({ label: "", minutes: 25 });
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [remainingSec, setRemainingSec] = useState(25 * 60);
  const accumulatedMs = useRef(0);
  const startedAt = useRef<number | null>(null);
  const runId = useRef(0);
  const finishedRun = useRef(-1);
  const plannedSec = Math.round(config.minutes * 60);

  useEffect(() => {
    if (status === "idle") setRemainingSec(plannedSec);
  }, [plannedSec, status]);

  const configure = useCallback((c: Partial<TimerConfig>) => {
    setConfig((p) => ({ ...p, ...c, minutes: Math.min(300, Math.max(1, c.minutes ?? p.minutes)) }));
  }, []);

  const complete = useCallback(() => {
    if (finishedRun.current === runId.current) return; // prevent duplicates
    finishedRun.current = runId.current;
    const activeSec = Math.round(accumulatedMs.current / 1000);
    startedAt.current = null;
    setStatus("done");
    setRemainingSec(0);
    update((d) => {
      let next = {
        ...d,
        focusSessions: [
          ...d.focusSessions,
          {
            id: uid("foc"),
            label: config.label || "Focus session",
            subjectId: config.subjectId,
            planSessionId: config.planSessionId,
            plannedSec,
            activeSec,
            completedAt: new Date().toISOString(),
          },
        ],
      };
      if (config.planSessionId && next.plan) {
        next = {
          ...next,
          plan: {
            ...next.plan,
            sessions: next.plan.sessions.map((s) =>
              s.id === config.planSessionId && !s.completed
                ? { ...s, completed: true, completedAt: new Date().toISOString(), completedVia: "timer" as const }
                : s
            ),
          },
        };
      }
      return withLog(next, "focus", `Completed a ${Math.round(activeSec / 60)}-minute focus session${config.label ? `: ${config.label}` : ""}`);
    });
    toast("Focus session complete — nice work! 🎉", "success");
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("StudyPilot AI", { body: "Focus session complete." });
      }
    } catch {
      /* notifications unsupported */
    }
  }, [config, plannedSec, update, toast]);

  useEffect(() => {
    if (status !== "running") return;
    const tick = () => {
      const elapsed = accumulatedMs.current + (startedAt.current ? Date.now() - startedAt.current : 0);
      const left = Math.max(0, Math.ceil((plannedSec * 1000 - elapsed) / 1000));
      setRemainingSec(left);
      if (left <= 0) {
        accumulatedMs.current = plannedSec * 1000;
        complete();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [status, plannedSec, complete]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const m = String(Math.floor(remainingSec / 60)).padStart(2, "0");
    const s = String(remainingSec % 60).padStart(2, "0");
    document.title = status === "running" || status === "paused" ? `${m}:${s} · StudyPilot AI` : "StudyPilot AI — Your Personal AI Study Planner";
  }, [remainingSec, status]);

  const start = useCallback(() => {
    if (status === "running") return;
    runId.current += 1;
    accumulatedMs.current = 0;
    startedAt.current = Date.now();
    setRemainingSec(plannedSec);
    setStatus("running");
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
    } catch {
      /* ignore */
    }
  }, [status, plannedSec]);

  const pause = useCallback(() => {
    if (status !== "running") return;
    if (startedAt.current) accumulatedMs.current += Date.now() - startedAt.current;
    startedAt.current = null;
    setStatus("paused");
  }, [status]);

  const resume = useCallback(() => {
    if (status !== "paused") return;
    startedAt.current = Date.now();
    setStatus("running");
  }, [status]);

  const reset = useCallback(() => {
    accumulatedMs.current = 0;
    startedAt.current = null;
    setStatus("idle");
    setRemainingSec(plannedSec);
  }, [plannedSec]);

  void data;
  return (
    <Ctx.Provider value={{ status, config, remainingSec, plannedSec, configure, start, pause, resume, reset }}>{children}</Ctx.Provider>
  );
}
