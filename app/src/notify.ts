import * as Notifications from "expo-notifications";

export async function initNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false, // the alarm player makes the noise
      shouldSetBadge: false,
    }),
  });
  await Notifications.requestPermissionsAsync();
}

export async function notifyAlarm(body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: "Fiverr message! Tap to stop", body },
    trigger: null,
  });
}

export async function notifyLostConnection(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: "⚠️ Lost connection to laptop", body: "Open Fiverr Alarm to reconnect." },
    trigger: null,
  });
}
