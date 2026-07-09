import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { AlertTriangle, Crosshair, Square, Terminal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/sheaf/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Line = { id: number; kind: "out" | "sys" | "err" | "cmd"; text: string };

function consoleWsUrl(engagementId: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  // Same-origin so Vite can proxy `/api` (ws:true) in dev.
  return `${proto}//${window.location.host}/api/console?engagementId=${encodeURIComponent(engagementId)}`;
}

/**
 * Local job console — bash -lc streamed jobs, not a full interactive PTY.
 * Only works when API is on loopback. Treat as host shell (XSS ≈ RCE).
 */
export function ConsolePage() {
  const { engagementId } = useParams({ strict: false }) as { engagementId: string };
  const qc = useQueryClient();
  const [lines, setLines] = useState<Line[]>([]);
  const [cmd, setCmd] = useState("");
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [cwd, setCwd] = useState("");
  const [captureLine, setCaptureLine] = useState("nmap -sn 127.0.0.1");
  const seq = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Survives Strict Mode effect remount (same component instance). */
  const everConnected = useRef(false);
  const introShown = useRef(false);
  const failHintShown = useRef(false);

  const settingsQ = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });

  const captureMut = useMutation({
    mutationFn: () => {
      const argv =
        captureLine.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((a) => a.replace(/^"|"$/g, "")) ??
        [];
      return api.wrapCommand({
        argv,
        engagementId,
        autoImport: settingsQ.data?.data.autoImportOnWrap !== false,
      });
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      push("sys", `[capture] ${res.data.message}`);
      if (res.data.stderrTail) push("out", res.data.stderrTail.slice(-2000));
      qc.invalidateQueries({ queryKey: ["runs", engagementId] });
      qc.invalidateQueries({ queryKey: ["assets", engagementId] });
      qc.invalidateQueries({ queryKey: ["findings", engagementId] });
      qc.invalidateQueries({ queryKey: ["timeline", engagementId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const push = useCallback((kind: Line["kind"], text: string) => {
    seq.current += 1;
    setLines((prev) => {
      const next = [...prev, { id: seq.current, kind, text }];
      return next.length > 4000 ? next.slice(-3000) : next;
    });
  }, []);

  useEffect(() => {
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | null = null;
    let opened = false;
    // React Strict Mode remounts effects in dev — first socket is intentionally closed.
    let intentionalClose = false;

    function clearRetry() {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
    }

    function scheduleReconnect() {
      clearRetry();
      if (disposed) return;
      retryTimer = setTimeout(connect, 1200);
    }

    function connect() {
      if (disposed) return;
      clearRetry();

      if (socket) {
        intentionalClose = true;
        try {
          socket.onopen = null;
          socket.onclose = null;
          socket.onerror = null;
          socket.onmessage = null;
          socket.close();
        } catch {
          // ignore
        }
        socket = null;
      }

      intentionalClose = false;
      opened = false;
      const ws = new WebSocket(consoleWsUrl(engagementId));
      socket = ws;
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed || ws !== socket) return;
        opened = true;
        everConnected.current = true;
        setConnected(true);
      };

      ws.onclose = () => {
        if (ws !== socket && !intentionalClose) return;
        setConnected(false);
        setRunning(false);
        if (disposed || intentionalClose) return;
        // Unexpected drop after a live session
        if (opened) {
          push("sys", "connection lost · retrying…");
        }
        scheduleReconnect();
      };

      // Browsers fire error before close on failed upgrade; do not log here
      // (cleanup closes also trigger error in some browsers).
      ws.onerror = () => {};

      ws.onmessage = (ev) => {
        if (disposed || ws !== socket) return;
        try {
          const msg = JSON.parse(String(ev.data)) as {
            type: string;
            data?: string;
            message?: string;
            code?: number | null;
            cwd?: string;
          };
          if (msg.type === "hello") {
            if (msg.cwd) setCwd(msg.cwd);
            if (!introShown.current) {
              introShown.current = true;
              push(
                "sys",
                msg.message ||
                  "Sheaf local console · bash -lc · 127.0.0.1 only",
              );
            }
            return;
          }
          if (msg.type === "out" && msg.data != null) {
            push("out", msg.data);
            return;
          }
          if (msg.type === "status" && msg.message) {
            push("cmd", msg.message);
            setRunning(true);
            return;
          }
          if (msg.type === "exit") {
            push("sys", `exit ${msg.code ?? "?"}`);
            setRunning(false);
            return;
          }
          if (msg.type === "error") {
            push("err", msg.message || "error");
            setRunning(false);
          }
        } catch {
          push("err", "bad server frame");
        }
      };
    }

    connect();

    const failHint = setTimeout(() => {
      if (disposed || everConnected.current || failHintShown.current) return;
      failHintShown.current = true;
      push(
        "err",
        "could not reach console WebSocket — start API on 127.0.0.1:7420 (pnpm dev:api)",
      );
    }, 4000);

    return () => {
      disposed = true;
      intentionalClose = true;
      clearTimeout(failHint);
      clearRetry();
      if (socket) {
        try {
          socket.onopen = null;
          socket.onclose = null;
          socket.onerror = null;
          socket.onmessage = null;
          socket.close();
        } catch {
          // ignore
        }
      }
      socket = null;
      wsRef.current = null;
      setConnected(false);
      setRunning(false);
    };
  }, [engagementId, push]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  function runCommand(raw: string) {
    const command = raw.trim();
    if (!command || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "run", command }));
    setCmd("");
    setRunning(true);
  }

  function kill() {
    wsRef.current?.send(JSON.stringify({ type: "kill" }));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border px-3 py-3 sm:px-5 lg:px-6">
        <PageHeader
          className="mb-0"
          eyebrow="Local shell"
          title="Console"
          description="Streamed bash -lc jobs against this machine’s workspace. Not a full PTY. 127.0.0.1 only."
          actions={
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]",
                  connected
                    ? "border-low/40 text-low"
                    : "border-destructive/40 text-destructive",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    connected ? "bg-low" : "bg-destructive",
                  )}
                />
                {connected ? "local" : "offline"}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={!running}
                onClick={kill}
                title="Kill running job"
              >
                <Square className="size-3.5" />
                Kill
              </Button>
            </div>
          }
        />
      </div>

      <div className="mx-3 mt-3 flex items-start gap-2 rounded-md border border-high/30 bg-high/10 px-3 py-2 text-[12px] text-high sm:mx-5 lg:mx-6">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <p>
          This console can run any command the Sheaf process user can run. Keep the API on{" "}
          <code className="font-mono text-[11px]">127.0.0.1</code>. A compromised UI (XSS)
          is equivalent to shell on this host. Authorized use only.
        </p>
      </div>

      <div className="mx-3 mt-2 rounded-md border border-border bg-card/60 px-3 py-2 sm:mx-5 lg:mx-6">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-faint">
          <Crosshair className="size-3" />
          Capture to this engagement
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            if (!captureLine.trim()) return;
            captureMut.mutate();
          }}
        >
          <Input
            className="font-mono text-[12px]"
            value={captureLine}
            onChange={(e) => setCaptureLine(e.target.value)}
            placeholder="nmap -sV target   or   nuclei -u https://…"
            data-testid="capture-command"
          />
          <Button
            type="submit"
            size="sm"
            className="shrink-0"
            disabled={captureMut.isPending || !captureLine.trim()}
          >
            {captureMut.isPending ? "Capturing…" : "Run & import"}
          </Button>
        </form>
        <p className="mt-1.5 text-[11px] text-faint">
          Known tools (nmap, nuclei, httpx, ffuf, naabu) get machine-readable flags and
          import into this case. CLI:{" "}
          <code className="font-mono text-muted">sheaf wrap -e … -- nmap …</code>
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-5 lg:px-6">
        <div
          className="console-surface flex h-full min-h-[280px] flex-col overflow-hidden rounded-md border border-border"
          data-testid="console-surface"
        >
          <div className="flex items-center gap-2 border-b border-white/5 px-3 py-1.5 text-[11px] text-[#7a8a72]">
            <Terminal className="size-3.5" />
            <span className="truncate font-mono">
              {cwd || "workspace"}
              {running ? " · running…" : ""}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[12px] leading-relaxed">
            {lines.length === 0 && (
              <div className="text-[#5c6b55]">
                Type a command below (e.g. <span className="text-[#9db892]">which nmap</span>,{" "}
                <span className="text-[#9db892]">pwd</span>,{" "}
                <span className="text-[#9db892]">ls</span>). Output streams here.
              </div>
            )}
            {lines.map((l) => (
              <pre
                key={l.id}
                className={cn(
                  "m-0 whitespace-pre-wrap break-words font-mono text-[12px]",
                  l.kind === "out" && "text-[#c8d6c0]",
                  l.kind === "cmd" && "mt-2 text-[#e8c07a]",
                  l.kind === "sys" && "text-[#6a7a64]",
                  l.kind === "err" && "text-[#e88a7a]",
                )}
              >
                {l.text}
              </pre>
            ))}
            <div ref={bottomRef} />
          </div>
          <form
            className="flex items-center gap-2 border-t border-white/5 bg-black/20 px-2 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              runCommand(cmd);
            }}
          >
            <span className="pl-1 font-mono text-[13px] text-[#9db892]">$</span>
            <Input
              ref={inputRef}
              data-testid="console-input"
              className="h-8 border-0 bg-transparent font-mono text-[13px] text-[#e6efe0] shadow-none focus-visible:ring-0"
              placeholder={connected ? "command…" : "waiting for connection…"}
              value={cmd}
              disabled={!connected}
              onChange={(e) => setCmd(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <Button type="submit" size="sm" disabled={!connected || !cmd.trim()}>
              Run
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
