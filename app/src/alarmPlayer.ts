import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from "expo-audio";

let silence: AudioPlayer | null = null;
let alarm: AudioPlayer | null = null;
let ringing = false;

export function startKeepAlive(): void {
  if (!silence) {
    silence = createAudioPlayer(require("../assets/silence.wav"));
    silence.loop = true;
    silence.volume = 1;
    // Review Focus 4: when a call/Siri interruption ends, iOS pauses us; restart the loop.
    silence.addListener("playbackStatusUpdate", (s: any) => {
      if (!ringing && s && s.playing === false && s.didJustFinish !== true && silence) silence.play();
    });
  }
  silence.play();
}

export async function initAudio(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: "mixWithOthers",
  });
  startKeepAlive();
}

export function ringAlarm(): void {
  if (ringing) return;
  ringing = true;
  silence?.pause();
  if (!alarm) {
    alarm = createAudioPlayer(require("../assets/alarm.wav"));
    alarm.loop = true;
  }
  alarm.volume = 1;
  alarm.seekTo(0);
  alarm.play();
}

export function stopAlarm(): void {
  ringing = false;
  alarm?.pause();
  startKeepAlive();
}

export const isRinging = (): boolean => ringing;
