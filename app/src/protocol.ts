export type AlarmMsg = { type: "alarm"; id: string; title: string; body: string; ts: number };
export type ServerMsg = AlarmMsg | { type: "pong" };

export function parseServerMsg(raw: string): ServerMsg | null {
  let m: any;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!m || typeof m !== "object") return null;
  if (m.type === "pong") return { type: "pong" };
  if (m.type === "alarm" && typeof m.id === "string") {
    return {
      type: "alarm",
      id: m.id,
      title: String(m.title ?? ""),
      body: String(m.body ?? ""),
      ts: Number(m.ts ?? 0),
    };
  }
  return null;
}

export const ackMsg = (id: string): string => JSON.stringify({ type: "ack", id });
export const pingMsg = (): string => JSON.stringify({ type: "ping" });
