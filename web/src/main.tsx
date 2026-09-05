import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./lib/i18n";
import "./index.css";

// StrictMode desactivado: MindAR (si se reactiva) toma control exclusivo
// de cámara + WebGLRenderer y el doble-mount deja dos instancias en negro.
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing application root element");
createRoot(rootElement).render(<App />);
