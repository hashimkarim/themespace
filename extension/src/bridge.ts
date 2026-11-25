import {
  BRIDGE_APP,
  BRIDGE_EXTENSION,
  type AppToBridge,
  type BridgeToApp,
} from "./shared/messages";

/**
 * Runs only on themespace.app (and local dev). Relays the editor's live draft
 * to the extension and hands picked-up themes to the editor, where the site's
 * own signed-in UI saves or publishes them. The server API is never called
 * from another origin.
 */
const post = (message: BridgeToApp) =>
  window.postMessage(message, location.origin);
let draftTimer: ReturnType<typeof setTimeout> | undefined;

window.addEventListener("message", async (event: MessageEvent<AppToBridge>) => {
  // Only the ThemeSpace page itself, never frames or other windows.
  if (event.source !== window || event.origin !== location.origin) return;
  const data = event.data;
  if (!data || typeof data !== "object" || data.source !== BRIDGE_APP) return;
  if (data.type === "ready") {
    post({ source: BRIDGE_EXTENSION, type: "hello" });
    const reply = await chrome.runtime.sendMessage({ type: "take-import" });
    if (reply?.ok && reply.value)
      post({ source: BRIDGE_EXTENSION, type: "import", theme: reply.value });
  } else if (data.type === "draft") {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      chrome.runtime
        .sendMessage({ type: "studio-draft", theme: data.theme })
        .catch(() => {});
    }, 150);
  }
});
post({ source: BRIDGE_EXTENSION, type: "hello" });
