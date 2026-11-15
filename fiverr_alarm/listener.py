"""Windows-only: reads toast notifications via UserNotificationListener."""
import asyncio

from .notice import Notice


class AccessDenied(Exception):
    pass


async def request_access() -> None:
    from winrt.windows.ui.notifications.management import (
        UserNotificationListener,
        UserNotificationListenerAccessStatus,
    )

    status = await UserNotificationListener.current.request_access_async()
    if status != UserNotificationListenerAccessStatus.ALLOWED:
        raise AccessDenied()


async def fetch_toasts() -> list[Notice]:
    from winrt.windows.ui.notifications import KnownNotificationBindings, NotificationKinds
    from winrt.windows.ui.notifications.management import UserNotificationListener

    items = await UserNotificationListener.current.get_notifications_async(NotificationKinds.TOAST)
    out = []
    for u in items:
        binding = u.notification.visual.get_binding(KnownNotificationBindings.get_toast_generic())
        texts = [t.text for t in binding.get_text_elements()] if binding else []
        texts += [""] * (2 - len(texts))
        out.append(Notice(u.id, u.app_info.display_info.display_name, texts[0], texts[1]))
    return out


async def _spike():
    await request_access()
    seen: set[int] = set()
    while True:
        for n in await fetch_toasts():
            if n.id not in seen:
                seen.add(n.id)
                print(n, flush=True)
        await asyncio.sleep(2)


if __name__ == "__main__":
    try:
        asyncio.run(_spike())
    except AccessDenied:
        print("Allow notification access: Settings > Privacy & security > Notifications, then rerun.")
