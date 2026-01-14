import { initRouter } from "@/messaging/core";

console.log("background is running");

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "COUNT") {
    console.log(
      "background has received a message from popup, and count is ",
      request?.count,
    );
  }
});

console.log("Background service worker starting...");

const OFFSCREEN_PATH = "offscreen.html";

async function setupOffscreen() {
  try {
    if (await chrome.offscreen.hasDocument()) {
      return;
    }

    const url = chrome.runtime.getURL(OFFSCREEN_PATH);
    console.log("Creating offscreen document with URL:", url);

    await chrome.offscreen.createDocument({
      url,
      // @ts-expect-error Offscreen reasons string literals missing in current @types/chrome
      reasons: ["LOCAL_STORAGE", "WORKERS"],
      justification:
        "Database storage (SQLite) and WASM execution for log management",
    });
    console.log("Offscreen document created successfully");
  } catch (err) {
    console.error("CRITICAL: Failed to setup offscreen document:", err);
    // In dev mode, the page might fail to load if the dev server is still starting.
    // We can try to retry after a short delay.
    // @ts-ignore
    if (import.meta.env.DEV) {
      console.log("Retrying offscreen setup in 2 seconds...");
      setTimeout(setupOffscreen, 2000);
    }
  }
}

// Initialize offscreen and router
// In dev mode, give the dev server a second to start up
// @ts-ignore
if (import.meta.env.DEV) {
  setTimeout(setupOffscreen, 1000);
} else {
  setupOffscreen();
}
initRouter({ debug: true });

// Listen for any request and ensure offscreen is ready
// This is a safety measure to ensure the offscreen document is awake
// when any message comes through.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "request") {
    setupOffscreen();
  }
});
