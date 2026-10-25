// Reply notifications ("Notify me of replies" on the Arrived page). Notifications only count as on once the browser
// has granted permission AND a push subscription has been registered with a push service. Cat Pal has no push
// service yet (no service worker, no VAPID key, nothing on the server to send them), so `enableReplyNotifications`
// says "unavailable" without asking for permission (a permission that would never bring a notification), and nothing
// is ever marked on. To turn them on: a service worker, a VAPID key (VITE_VAPID_PUBLIC_KEY), a table for the
// subscriptions and a server function that sends one when a letter arrives — then `subscribe` below.

export type NotifyState = 'off' | 'on' | 'unavailable' | 'denied' | 'failed';

const KEY = 'cp-reply-notify';
const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** whether "Notify me of replies" is offered at all: not until the push service above exists (until then the Arrived
 *  page goes straight on to the Mailbox, rather than showing a button that can only say "not yet") */
export const REPLY_NOTIFY_OFFERED = false;

/** what's known on this device: on only if a subscription was registered here */
export function replyNotifyState(): NotifyState {
  try { return localStorage.getItem(KEY) === 'on' ? 'on' : 'off'; } catch { return 'off'; }
}

/** where the browser can't, or there's no push service to register with: unavailable, and the permission isn't asked */
const supported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

export async function enableReplyNotifications(subscribe?: (sub: PushSubscription) => Promise<void>): Promise<NotifyState> {
  if (!supported() || !VAPID || !subscribe) return 'unavailable';
  if (Notification.permission === 'denied') return 'denied';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID }));
    await subscribe(sub);
    try { localStorage.setItem(KEY, 'on'); } catch { /* storage off: on for now only */ }
    return 'on';
  } catch {
    return 'failed';
  }
}
