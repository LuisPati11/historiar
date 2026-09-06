import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import "./lib/i18n";
import "./index.css";

let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;

registerSW({
  immediate: true,
  onRegisteredSW: (_serviceWorkerUrl, registration) => {
    serviceWorkerRegistration = registration;
    void registration?.update();
  },
});

const refreshServiceWorker = () => {
  if (document.visibilityState === "visible") void serviceWorkerRegistration?.update();
};

document.addEventListener("visibilitychange", refreshServiceWorker);
window.addEventListener("pageshow", refreshServiceWorker);

// StrictMode desactivado: MindAR (si se reactiva) toma control exclusivo
// de cámara + WebGLRenderer y el doble-mount deja dos instancias en negro.
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing application root element");
createRoot(rootElement).render(<App />);
