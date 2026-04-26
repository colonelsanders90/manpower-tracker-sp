/**
 * Three-layer error capture per CLAUDE.md spec.
 *
 *   1. window.onerror + unhandledrejection — uncaught exceptions / failed promises
 *   2. React ErrorBoundary — render-phase crashes (calls reportCriticalError)
 *   3. App.tsx startup error — init / JSOM / SP API failures before render
 *
 * Public:
 *   - init() — call once before createRoot()
 *   - log(level, message, detail?) — manual entry (catch blocks, startup phase)
 *   - reportCriticalError(message, stack?) — used by ErrorBoundary
 *   - onCriticalError(cb) — subscribe (for GlobalErrorDialog)
 *   - downloadLog() — emits a .txt with metadata + entries
 */

export type LogLevel = "info" | "warn" | "error";

export type LogEntry = {
  ts: string;
  level: LogLevel;
  message: string;
  detail?: unknown;
  stack?: string;
};

const MAX_ENTRIES = 500;
const entries: LogEntry[] = [];
const criticalListeners: Array<(message: string) => void> = [];

export function init(): void {
  // Intercept console.error / warn so they end up in the log too.
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...args: unknown[]) => {
    push("error", args.map(String).join(" "));
    origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    push("warn", args.map(String).join(" "));
    origWarn(...args);
  };

  window.addEventListener("error", (ev) => {
    push("error", ev.message ?? "window.onerror", ev.error, ev.error?.stack);
    notifyCritical(ev.message ?? "window.onerror");
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";
    const stack = reason instanceof Error ? reason.stack : undefined;
    push("error", `Unhandled rejection: ${message}`, reason, stack);
    notifyCritical(message);
  });
}

export function log(
  level: LogLevel,
  message: string,
  detail?: unknown,
): void {
  push(level, message, detail);
}

export function reportCriticalError(message: string, stack?: string): void {
  push("error", message, undefined, stack);
  notifyCritical(message);
}

export function onCriticalError(cb: (message: string) => void): () => void {
  criticalListeners.push(cb);
  return () => {
    const i = criticalListeners.indexOf(cb);
    if (i >= 0) criticalListeners.splice(i, 1);
  };
}

export function downloadLog(): void {
  const meta = [
    `Manpower Tracker — diagnostic log`,
    `Generated: ${new Date().toISOString()}`,
    `URL:       ${window.location.href}`,
    `User-Agent: ${navigator.userAgent}`,
    "".padEnd(80, "-"),
    "",
  ].join("\n");

  const body = entries
    .map((e) => {
      const head = `[${e.ts}] ${e.level.toUpperCase()} ${e.message}`;
      const detail =
        e.detail != null ? `\n  detail: ${safeJson(e.detail)}` : "";
      const stack = e.stack ? `\n  stack: ${e.stack}` : "";
      return head + detail + stack;
    })
    .join("\n");

  const blob = new Blob([meta + body + "\n"], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `manpower-tracker-log-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------

function push(
  level: LogLevel,
  message: string,
  detail?: unknown,
  stack?: string,
): void {
  entries.push({
    ts: new Date().toISOString(),
    level,
    message,
    detail,
    stack,
  });
  if (entries.length > MAX_ENTRIES) entries.shift();
}

function notifyCritical(message: string): void {
  for (const cb of criticalListeners) {
    try {
      cb(message);
    } catch {
      // listener errors must not break logging
    }
  }
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
