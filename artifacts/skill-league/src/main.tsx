import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startPiAutoInit } from "./lib/pi-auth";

// ── Pi SDK early init ────────────────────────────────────────────────────────
// Kick off Pi.init() as early as possible so it is fully resolved before any
// authentication attempt. In Pi Browser window.Pi is pre-injected, so this
// fires synchronously on page load. Outside Pi Browser it is a no-op.
startPiAutoInit();

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
