import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PopoutApp } from "./PopoutApp";
import type { PopoutTab } from "./types";
import "./styles.css";

const params = new URLSearchParams(window.location.search);
const popout = params.get("popout");
const isPopout = popout === "notes" || popout === "tasks" || popout === "timer";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isPopout ? <PopoutApp tab={popout as PopoutTab} /> : <App />}</React.StrictMode>
);
