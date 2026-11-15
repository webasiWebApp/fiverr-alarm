import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { initAudio, ringAlarm, stopAlarm } from "./src/alarmPlayer";
import { initNotifications, notifyAlarm, notifyLostConnection } from "./src/notify";
import { AlarmMsg } from "./src/protocol";
import { useLaptopSocket } from "./src/useLaptopSocket";

const HOST_KEY = "laptopHost";
const LOST_AFTER_MS = 60000;
const hhmm = (ts: number) => new Date(ts).toTimeString().slice(0, 5);

type Item = { id: string; body: string; at: number };

export default function App() {
  const [host, setHost] = useState("");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Item[]>([]);
  const [history, setHistory] = useState<Item[]>([]);
  const pendingIds = useRef(new Set<string>());
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    initAudio().catch(() => {});
    initNotifications().catch(() => {});
    AsyncStorage.getItem(HOST_KEY).then((h) => {
      if (h) {
        setHost(h);
        setDraft(h);
      }
    });
  }, []);

  const onAlarm = useCallback((m: AlarmMsg) => {
    if (pendingIds.current.has(m.id)) return; // laptop re-sends unacked alarms on reconnect
    pendingIds.current.add(m.id);
    const item = { id: m.id, body: m.body || m.title, at: Date.now() };
    setPending((p) => [...p, item]);
    if (!seenIds.current.has(m.id)) {
      seenIds.current.add(m.id);
      setHistory((h) => [item, ...h].slice(0, 50));
    }
    ringAlarm();
    notifyAlarm(item.body).catch(() => {});
  }, []);

  const { status, ack, disconnectedSince } = useLaptopSocket(host, onAlarm);

  // warn once per disconnect after 60 s
  useEffect(() => {
    if (disconnectedSince == null) return;
    const t = setTimeout(() => notifyLostConnection().catch(() => {}), LOST_AFTER_MS);
    return () => clearTimeout(t);
  }, [disconnectedSince]);

  const stop = () => {
    stopAlarm();
    pending.forEach((p) => ack(p.id));
    pendingIds.current.clear();
    setPending([]);
  };

  const save = async () => {
    const h = draft.trim();
    await AsyncStorage.setItem(HOST_KEY, h);
    setHost(h);
  };

  if (pending.length > 0) {
    return (
      <SafeAreaView style={[styles.fill, styles.red]}>
        <Text style={styles.big}>FIVERR!</Text>
        <FlatList
          style={styles.list}
          data={pending}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <Text style={styles.alarmText}>{item.body}</Text>}
        />
        <Pressable style={styles.stop} onPress={stop} accessibilityRole="button">
          <Text style={styles.stopText}>STOP</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const label = status === "connected" ? "Connected to laptop" : status === "connecting" ? "Connecting…" : "Not connected";
  const dot = status === "connected" ? "#22c55e" : status === "connecting" ? "#f59e0b" : "#ef4444";

  return (
    <SafeAreaView style={styles.fill}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={styles.status}>{label}</Text>
      </View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Laptop IP, e.g. 192.168.1.20"
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={styles.save} onPress={save} accessibilityRole="button">
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>
      <FlatList
        data={history}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text style={styles.empty}>No alarms yet.</Text>}
        renderItem={({ item }) => (
          <Text style={styles.hist}>
            {hhmm(item.at)}  {item.body}
          </Text>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#fff", padding: 16 },
  red: { backgroundColor: "#dc2626", justifyContent: "center" },
  big: { color: "#fff", fontSize: 48, fontWeight: "900", textAlign: "center", marginBottom: 12 },
  list: { flexGrow: 0, maxHeight: 220, marginBottom: 24 },
  alarmText: { color: "#fff", fontSize: 20, textAlign: "center", marginBottom: 8 },
  stop: { backgroundColor: "#fff", borderRadius: 24, paddingVertical: 48, alignItems: "center" },
  stopText: { color: "#dc2626", fontSize: 56, fontWeight: "900" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16, marginTop: 24 },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 8 },
  status: { fontSize: 18, fontWeight: "600" },
  row: { flexDirection: "row", gap: 8, marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, fontSize: 16 },
  save: { backgroundColor: "#111", borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  saveText: { color: "#fff", fontWeight: "600" },
  empty: { color: "#888", textAlign: "center", marginTop: 24 },
  hist: { fontSize: 16, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#ddd" },
});
