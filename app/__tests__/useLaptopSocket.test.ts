import { act, renderHook } from "@testing-library/react-native";
import { useLaptopSocket } from "../src/useLaptopSocket";

class FakeWS {
  static all: FakeWS[] = [];
  sent: string[] = [];
  closed = false;
  onopen?: () => void;
  onclose?: () => void;
  onerror?: () => void;
  onmessage?: (e: { data: string }) => void;
  constructor(public url: string) {
    FakeWS.all.push(this);
  }
  send(s: string) {
    this.sent.push(s);
  }
  close() {
    this.closed = true;
  }
}
const last = () => FakeWS.all[FakeWS.all.length - 1];
const WebSocketImpl = FakeWS as unknown as typeof WebSocket;

beforeEach(() => {
  FakeWS.all = [];
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

test("alarm message calls onAlarm once", () => {
  const onAlarm = jest.fn();
  renderHook(() => useLaptopSocket("1.2.3.4", onAlarm, { WebSocketImpl }));
  expect(last().url).toBe("ws://1.2.3.4:8765");
  act(() => last().onopen!());
  act(() => last().onmessage!({ data: '{"type":"alarm","id":"a","title":"F","body":"hi","ts":1}' }));
  expect(onAlarm).toHaveBeenCalledTimes(1);
});

test("reconnects at 1s, 2s, 5s, 10s, 10s", () => {
  renderHook(() => useLaptopSocket("h", jest.fn(), { WebSocketImpl }));
  for (const d of [1000, 2000, 5000, 10000, 10000]) {
    const n = FakeWS.all.length;
    act(() => last().onclose!());
    act(() => jest.advanceTimersByTime(d - 1));
    expect(FakeWS.all.length).toBe(n);
    act(() => jest.advanceTimersByTime(1));
    expect(FakeWS.all.length).toBe(n + 1);
  }
});

test("ack sends ack message", () => {
  const { result } = renderHook(() => useLaptopSocket("h", jest.fn(), { WebSocketImpl }));
  act(() => last().onopen!());
  act(() => result.current.ack("a"));
  expect(last().sent).toContain('{"type":"ack","id":"a"}');
});

test("pings every 15s while open", () => {
  renderHook(() => useLaptopSocket("h", jest.fn(), { WebSocketImpl }));
  act(() => last().onopen!());
  act(() => jest.advanceTimersByTime(30000));
  expect(last().sent.filter((s) => s === '{"type":"ping"}').length).toBe(2);
});

test("host change closes old socket and opens a new one", () => {
  const { rerender } = renderHook(({ h }: { h: string }) => useLaptopSocket(h, jest.fn(), { WebSocketImpl }), {
    initialProps: { h: "a" },
  });
  const first = last();
  rerender({ h: "b" });
  expect(first.closed).toBe(true);
  expect(last().url).toBe("ws://b:8765");
});
