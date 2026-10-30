"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { ActivityLog, AppData } from "./types";
import { emptyData } from "./defaults";
import { loadData, saveData, STORAGE_KEY } from "./storage";
import { uid } from "./utils";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  msg: string;
  kind: ToastKind;
}

interface Ctx {
  data: AppData;
  ready: boolean;
  saveError: string | null;
  update: (fn: (d: AppData) => AppData) => void;
  replaceAll: (d: AppData) => void;
  toast: (msg: string, kind?: ToastKind) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}

export function withLog(d: AppData, kind: ActivityLog["kind"], text: string): AppData {
  const entry: ActivityLog = { id: uid("act"), kind, text, at: new Date().toISOString() };
  return { ...d, activity: [entry, ...d.activity].slice(0, 60) };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const skipSave = useRef(true);

  // Load from localStorage only after mount (never during SSR).
  useEffect(() => {
    const { data: loaded, error } = loadData();
    setData(loaded);
    if (error) setSaveError(error);
    setReady(true);
  }, []);

  // Persist on every change after the initial load.
  useEffect(() => {
    if (!ready) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    setSaveError(saveData(data));
  }, [data, ready]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        skipSave.current = true;
        setData(loadData().data);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Theme
  useEffect(() => {
    const apply = () => {
      const t = data.prefs.theme;
      const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    if (data.prefs.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [data.prefs.theme]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);
  const replaceAll = useCallback((d: AppData) => setData(d), []);
  const toast = useCallback((msg: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <StoreCtx.Provider value={{ data, ready, saveError, update, replaceAll, toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-6" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="fade-up pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-sm shadow-pop">
            {t.kind === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" /> : t.kind === "error" ? <AlertTriangle className="h-4 w-4 shrink-0 text-danger" /> : <Info className="h-4 w-4 shrink-0 text-primary" />}
            <span className="min-w-0 break-words">{t.msg}</span>
            <button aria-label="Dismiss" className="ml-1 text-muted hover:text-ink" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </StoreCtx.Provider>
  );
}
