# Fiverr to iPhone Alarm (free)

Phone Link mirrors iPhone notifications to Windows. A Python script on the laptop spots Fiverr ones
and tells a custom React Native app on the iPhone over home Wi-Fi (WebSocket, port 8765). The app
plays a looping alarm, even with the mute switch on, until you tap **STOP**. No paid accounts.

Honest limits: laptop on and awake, iPhone on the same Wi-Fi, within Bluetooth range; iOS may kill
the app sometimes (reopen it, unacked alarms from the last 10 min re-ring); free Apple ID apps expire
after 7 days; keep the media volume up; personal use only.

## Laptop setup
1. Install **Phone Link**, pair the iPhone. iPhone Settings > Bluetooth > (laptop) > **Share System Notifications ON**.
2. Windows: Settings > Privacy & security > Notifications: allow notification access.
3. Set the home Wi-Fi network profile to **Private**. In your router, reserve a fixed IP (DHCP reservation) for the laptop.
4. `python -m venv .venv`, then `.venv\Scripts\pip install -r requirements.txt`
5. **Spike gate**: `.venv\Scripts\python -m fiverr_alarm.listener`, trigger a Fiverr notification, confirm it prints.
   Save the output in `NOTES.md`. If nothing prints, stop: the design does not work on this setup.
6. Admin PowerShell: `.\scripts\install.ps1` (autostart, firewall rule for 8765, no AC sleep, prints the laptop IP).
7. Check from another device on the Wi-Fi: browser console `new WebSocket("ws://<laptop-ip>:8765")` should open.

Logs: `alarm.log`. Python tests: `.venv\Scripts\pytest`.

## iPhone app
Needs: GitHub account, your normal Apple ID, Node.js LTS, Git, **Sideloadly** and **iTunes from apple.com** (not the Microsoft Store one).

1. Push this folder to a GitHub repo. Actions > **ios-unsigned** > Run workflow. Download the `FiverrAlarm.ipa` artifact (zip).
2. iPhone: connect by USB. Open Sideloadly, drop in the `.ipa`, enter your Apple ID, Start.
3. iPhone: Settings > General > VPN & Device Management > trust your Apple ID. Settings > Privacy & Security > **Developer Mode ON** (restarts the phone).
4. Open **Fiverr Alarm**, allow **Local Network** and **Notifications**, type the laptop IP, Save. Expect a green dot.
5. Test: `.venv\Scripts\python -m fiverr_alarm --test` on the laptop. The phone loops the alarm until STOP.
6. Background test: Home Screen, lock the phone, wait 10 min, send a real Fiverr message. Alarm within about 5 s.
7. Missed-alarm test: force-quit the app, send a Fiverr message, reopen within 10 min. It rings on reconnect.
8. **Weekly refresh**: in Sideloadly turn on auto-refresh (phone and laptop on the same Wi-Fi), or re-sideload every 7 days.

App tests: `cd app && npx jest`.

## Troubleshooting
| Problem | Fix |
|---|---|
| App shows Not connected | Same Wi-Fi? Laptop IP changed? Network profile Private? Firewall rule for 8765? Local Network permission allowed? |
| Laptop log shows the toast but no alarm | iOS killed the app. Reopen it. |
| Laptop log shows nothing | Phone Link disconnected, "Share System Notifications" off, or Fiverr notifications off on the iPhone. |
| "Untrusted developer" | Settings > General > VPN & Device Management > trust. |
| Stopped opening after a week | 7-day signing expired. Re-sideload (data stays). |
| Alarm is quiet | Raise the media volume (side buttons while the app is open). |
| `pod install` fails in Actions | Re-run; check Expo SDK / Xcode versions in the log. |
