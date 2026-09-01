import { renderToString } from "react-dom/server";
import App, { SERVICES, pathFor, metaFor } from "./App.jsx";

// Every PUBLIC route this site has — used by scripts/prerender.mjs to
// know what static HTML files to generate, and to build sitemap.xml.
export const ROUTES = [
  "Home",
  "Services",
  "About",
  "Security",
  "Contact",
  "Upload",
  "ClientIntake",
  ...SERVICES.map((s) => s.slug),
].map((key) => ({ path: pathFor(key), ...metaFor(key) }));

// The /admin area is dynamic (intake IDs aren't known at build time), so
// only its shell ("/admin") gets a real prerendered file — vercel.json
// rewrites every other /admin/* path to that same shell, and the client
// JS takes over routing from there (same pattern services slugs use,
// minus build-time enumerability). Kept OUT of ROUTES/sitemap.xml on
// purpose — noindex, and never linked from a public page.
export const ADMIN_ROUTES = ["AdminLogin"].map((key) => ({ path: pathFor(key), ...metaFor(key), noindex: true }));

export function render(path) {
  return renderToString(<App initialPath={path} />);
}
