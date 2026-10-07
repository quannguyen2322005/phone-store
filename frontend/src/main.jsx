import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "../css/styles.css";

const legacyPath = window.location.pathname;
if (legacyPath.endsWith("/index.html")) {
  window.history.replaceState(null, "", `/${window.location.search}${window.location.hash}`);
} else if (legacyPath.endsWith("/about.html")) {
  window.history.replaceState(null, "", `/about${window.location.hash}`);
} else if (legacyPath.endsWith("/admin.html")) {
  window.history.replaceState(null, "", `/admin${window.location.hash}`);
} else if (legacyPath.endsWith("/product-detail.html")) {
  const id = new URLSearchParams(window.location.search).get("id");
  if (id) window.history.replaceState(null, "", `/product/${encodeURIComponent(id)}${window.location.hash}`);
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
