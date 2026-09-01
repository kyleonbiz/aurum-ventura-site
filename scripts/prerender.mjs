// Runs after the client + SSR builds. Renders every route to real static
// HTML (via src/entry-server.jsx) and writes it into dist/, so crawlers and
// other non-JS clients get actual content — a real <h1>, headings, and
// links — on the first response instead of an empty <div id="root">.
// Also generates sitemap.xml from this same ROUTES list, so it can never
// drift out of sync with the pages that actually exist.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://www.aurumventura.net";
const TOP_LEVEL_PATHS = new Set(["/services", "/about", "/security", "/contact"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");

const template = fs.readFileSync(path.join(distDir, "index.html"), "utf-8");
const { render, ROUTES, ADMIN_ROUTES } = await import(
  path.join(root, "dist-ssr", "entry-server.js")
);

for (const { path: routePath, title, description, noindex } of [...ROUTES, ...ADMIN_ROUTES]) {
  const appHtml = render(routePath);
  let html = template
    .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta name="description" content=".*?"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(description)}" />`
    );
  if (noindex) {
    html = html.replace("</head>", `  <meta name="robots" content="noindex, nofollow" />\n  </head>`);
  }

  const outDir = routePath === "/" ? distDir : path.join(distDir, routePath);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  console.log("prerendered", routePath, noindex ? "(noindex)" : "");
}

const today = new Date().toISOString().slice(0, 10);
const urlEntries = ROUTES.map(({ path: routePath }) => {
  const priority = routePath === "/" ? "1.0" : TOP_LEVEL_PATHS.has(routePath) ? "0.8" : "0.6";
  return `  <url>
    <loc>${SITE_URL}${routePath}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority}</priority>
  </url>`;
}).join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemap);
console.log("wrote sitemap.xml with", ROUTES.length, "urls");

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
