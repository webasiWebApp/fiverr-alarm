const players: any[] = [];
const setAudioModeAsync = jest.fn(async () => {});
jest.mock("expo-audio", () => ({
  setAudioModeAsync: (...a: any[]) => (setAudioModeAsync as any)(...a),
  createAudioPlayer: jest.fn(() => {
    const p: any = {
      loop: false, volume: 0, play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(),
      listeners: [] as any[],
      addListener: (_e: string, cb: any) => p.listeners.push(cb),
    };
    players.push(p);
    return p;
  }),
}));
jest.mock("../assets/silence.wav", () => 1, { virtual: true });
jest.mock("../assets/alarm.wav", () => 2, { virtual: true });

let mod: typeof import("../src/alarmPlayer");
beforeEach(() => {
  jest.resetModules();
  players.length = 0;
  setAudioModeAsync.mockClear();
  mod = require("../src/alarmPlayer");
});

test("initAudio sets the three options and starts the silent loop", async () => {
  await mod.initAudio();
  expect(setAudioModeAsync).toHaveBeenCalledWith({
    playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "mixWithOthers",
  });
  expect(players[0].loop).toBe(true);
  expect(players[0].play).toHaveBeenCalled();
});

test("ringAlarm twice creates one alarm player", async () => {
  await mod.initAudio();
  mod.ringAlarm();
  mod.ringAlarm();
  expect(players.length).toBe(2); // silence + one alarm
  expect(mod.isRinging()).toBe(true);
});

test("stopAlarm resumes silence", async () => {
  await mod.initAudio();
  mod.ringAlarm();
  const plays = players[0].play.mock.calls.length;
  mod.stopAlarm();
  expect(mod.isRinging()).toBe(false);
  expect(players[1].pause).toHaveBeenCalled();
  expect(players[0].play.mock.calls.length).toBe(plays + 1);
});

test("silent loop restarts after an interruption ends", async () => {
  await mod.initAudio();
  const before = players[0].play.mock.calls.length;
  players[0].listeners[0]({ playing: false });
  expect(players[0].play.mock.calls.length).toBe(before + 1);
});
