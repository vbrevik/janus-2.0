import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { Shell } from "./components/Shell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);
