import { registerSW } from "virtual:pwa-register";

/**
 * vite-plugin-pwa's registerType: "autoUpdate" activates a new service
 * worker in the background, but an already-open tab or installed PWA keeps
 * running its OLD in-memory JS until something reloads the page. On mobile,
 * where the app is usually resumed from a suspended background tab rather
 * than freshly loaded, that can leave a phone running stale code
 * indefinitely across many deploys, with no indication anything is wrong.
 * Reload as soon as a new version is ready, and check again whenever the
 * app is foregrounded, so this can never silently happen again.
 */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      });
    },
  });
}
