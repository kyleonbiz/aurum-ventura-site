// Runs after the client + SSR builds. Renders every route to real static
// HTML (via src/entry-server.jsx) and writes it into dist/, so crawlers and
// other non-JS clients get actual content — a real <h1>, headings, and
// links — on the first response instead of an empty <div id="root">.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");

const template = fs.readFileSync(path.join(distDir, "index.html"), "utf-8");
const { render, ROUTES } = await import(
  path.join(root, "dist-ssr", "entry-server.js")
);

for (const { path: routePath, title, description } of ROUTES) {
  const appHtml = render(routePath);
  const html = template
    .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta name="description" content=".*?"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(description)}" />`
    );

  const outDir = routePath === "/" ? distDir : path.join(distDir, routePath);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  console.log("prerendered", routePath);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
