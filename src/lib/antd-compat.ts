"use client";

import * as ReactDOM from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";

// React 19 no longer exposes `createRoot`/`hydrateRoot` on the `react-dom`
// entry. Ant Design v5 still checks for these keys to detect compatible
// environments. We re-export the client helpers onto the `react-dom` namespace
// so Ant Design can operate without showing the compatibility warning.
type ReactDOMWithCompat = typeof ReactDOM & {
  createRoot?: typeof createRoot;
  hydrateRoot?: typeof hydrateRoot;
};

const reactDom = ReactDOM as ReactDOMWithCompat;

if (!reactDom.createRoot) {
  reactDom.createRoot = createRoot;
}

if (!reactDom.hydrateRoot) {
  reactDom.hydrateRoot = hydrateRoot;
}
