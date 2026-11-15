import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("../src/alarmPlayer", () => ({
  initAudio: jest.fn(async () => {}), ringAlarm: jest.fn(), stopAlarm: jest.fn(),
}));
jest.mock("../src/notify", () => ({
  initNotifications: jest.fn(async () => {}), notifyAlarm: jest.fn(async () => {}),
  notifyLostConnection: jest.fn(async () => {}),
}));

let onAlarmCb: (m: any) => void;
const ack = jest.fn();
let socketState: any = { status: "connected", disconnectedSince: null };
jest.mock("../src/useLaptopSocket", () => ({
  useLaptopSocket: (_h: string, cb: any) => {
    onAlarmCb = cb;
    return { ...socketState, ack };
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import App from "../App";
import { ringAlarm } from "../src/alarmPlayer";
import { notifyLostConnection } from "../src/notify";

const alarm = (id: string, body: string) => ({ type: "alarm", id, title: "Fiverr", body, ts: 1 });

beforeEach(() => {
  jest.clearAllMocks();
  socketState = { status: "connected", disconnectedSince: null };
});

test("alarm shows STOP view and rings", async () => {
  render(<App />);
  act(() => onAlarmCb(alarm("a", "hello")));
  expect(screen.getByText("STOP")).toBeTruthy();
  expect(screen.getByText("hello")).toBeTruthy();
  expect(ringAlarm).toHaveBeenCalled();
});

test("two alarms then STOP acks both", async () => {
  render(<App />);
  act(() => onAlarmCb(alarm("a", "one")));
  act(() => onAlarmCb(alarm("b", "two")));
  fireEvent.press(screen.getByText("STOP"));
  expect(ack).toHaveBeenCalledWith("a");
  expect(ack).toHaveBeenCalledWith("b");
  expect(screen.queryByText("STOP")).toBeNull();
});

test("Save stores the host", async () => {
  render(<App />);
  fireEvent.changeText(screen.getByPlaceholderText(/Laptop IP/), "192.168.1.20");
  fireEvent.press(screen.getByText("Save"));
  await waitFor(() => expect(AsyncStorage.getItem("laptopHost")).resolves.toBe("192.168.1.20"));
});

test("60 s disconnected warns once", () => {
  jest.useFakeTimers();
  socketState = { status: "disconnected", disconnectedSince: 1 };
  render(<App />);
  act(() => jest.advanceTimersByTime(60000));
  expect(notifyLostConnection).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
