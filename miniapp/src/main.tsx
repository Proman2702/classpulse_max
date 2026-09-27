import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { max } from "./lib/max";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/ui.css";
import "./styles/screens.css";

max.ready();

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
