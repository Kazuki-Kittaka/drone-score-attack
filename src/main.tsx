import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/900.css";
import "./style.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
// Keep the current app version during an active race. Updates activate after all tabs close.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .catch(() =>
        console.info(
          "オフラインキャッシュは無効です。ローカルサーバーでは通信なしで利用できます。",
        ),
      );
  });
}
