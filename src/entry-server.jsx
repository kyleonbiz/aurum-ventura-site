import { renderToString } from "react-dom/server";
import App, { SERVICES, pathFor, metaFor } from "./App.jsx";

// Every route this site has — used by scripts/prerender.mjs to know what
// static HTML files to generate.
export const ROUTES = [
  "Home",
  "Services",
  "About",
  "Contact",
  ...SERVICES.map((s) => s.slug),
].map((key) => ({ path: pathFor(key), ...metaFor(key) }));

export function render(path) {
  return renderToString(<App initialPath={path} />);
}
