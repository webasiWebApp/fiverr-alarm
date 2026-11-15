import { ackMsg, parseServerMsg, pingMsg } from "../src/protocol";

test("parses alarm", () => {
  expect(parseServerMsg('{"type":"alarm","id":"a","title":"Fiverr","body":"hi","ts":1}')).toEqual({
    type: "alarm", id: "a", title: "Fiverr", body: "hi", ts: 1,
  });
});
test("parses pong", () => expect(parseServerMsg('{"type":"pong"}')).toEqual({ type: "pong" }));
test("bad json -> null", () => expect(parseServerMsg("x")).toBeNull());
test("unknown type -> null", () => expect(parseServerMsg('{"type":"other"}')).toBeNull());
test("ack and ping", () => {
  expect(ackMsg("a")).toBe('{"type":"ack","id":"a"}');
  expect(pingMsg()).toBe('{"type":"ping"}');
});
