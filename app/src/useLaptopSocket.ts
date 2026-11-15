import { useCallback, useEffect, useRef, useState } from "react";
import { AlarmMsg, ackMsg, parseServerMsg, pingMsg } from "./protocol";

export const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000]; // then stays at 10000
export const PING_MS = 15000;

type Opts = { WebSocketImpl?: typeof WebSocket; now?: () => number };
type Status = "connected" | "connecting" | "disconnected";

export function useLaptopSocket(host: string, onAlarm: (m: AlarmMsg) => void, opts: Opts = {}) {
  const [status, setStatus] = useState<Status>("disconnected");
  const [disconnectedSince, setDisconnectedSince] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onAlarmRef = useRef(onAlarm);
  onAlarmRef.current = onAlarm;
  const WS = opts.WebSocketImpl ?? WebSocket;
  const now = opts.now ?? Date.now;

  useEffect(() => {
    if (!host) {
      setStatus("disconnected");
      return;
    }
    let stopped = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    setDisconnectedSince((s) => s ?? now());

    const connect = () => {
      if (stopped) return;
      setStatus("connecting");
      const ws = new WS(`ws://${host}:8765`);
      wsRef.current = ws;
      ws.onopen = () => {
        attempt = 0;
        setStatus("connected");
        setDisconnectedSince(null);
        pingTimer = setInterval(() => ws.send(pingMsg()), PING_MS);
      };
      ws.onmessage = (e: any) => {
        const m = parseServerMsg(String(e.data));
        if (m?.type === "alarm") onAlarmRef.current(m);
      };
      const lost = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (stopped || wsRef.current !== ws) return;
        wsRef.current = null;
        setStatus("disconnected");
        setDisconnectedSince((s) => s ?? now());
        const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
        attempt++;
        retryTimer = setTimeout(connect, delay);
      };
      ws.onclose = lost;
      ws.onerror = lost; // lost() is idempotent: the wsRef check stops a double reconnect
    };
    connect();

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (pingTimer) clearInterval(pingTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [host]); // eslint-disable-line react-hooks/exhaustive-deps

  const ack = useCallback((id: string) => {
    try {
      wsRef.current?.send(ackMsg(id));
    } catch {}
  }, []);

  return { status, ack, disconnectedSince };
}
