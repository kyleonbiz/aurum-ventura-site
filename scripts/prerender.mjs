// Runs after the client + SSR builds. Renders every route to real static
// HTML (via src/entry-server.jsx) and writes it into dist/, so crawlers and
// other non-JS clients get actual content — a real <h1>, headings, links, and
// structured data — on the first response instead of an empty <div id="root">.
// Also generates sitemap.xml and llms.txt from this same ROUTES list, so they
// can never drift out of sync with the pages that actually exist.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://www.aurumventura.net";
const TOP_LEVEL_PATHS = new Set(["/services", "/products", "/about", "/industries", "/how-it-works", "/security", "/contact"]);
// Disallowed in robots.txt, so they don't belong in the sitemap.
const NOT_IN_SITEMAP = new Set(["/upload", "/client-intake"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");

const template = fs.readFileSync(path.join(distDir, "index.html"), "utf-8");
const { render, ROUTES, ADMIN_ROUTES } = await import(
  path.join(root, "dist-ssr", "entry-server.js")
);

for (const { path: routePath, title, description, noindex } of [...ROUTES, ...ADMIN_ROUTES]) {
  const appHtml = render(routePath);
  const url = SITE_URL + routePath;
  let html = template
    .replace('<div id="root"></div>', () => `<div id="root">${appHtml}</div>`)
    .replace(/<title>.*?<\/title>/, () => `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content=".*?"\s*\/?>/, () =>
      `<meta name="description" content="${escapeHtml(description)}" />`
    )
    // Each page declares itself, not the homepage, as canonical and og:url.
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, () => `<link rel="canonical" href="${url}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, () => `<meta property="og:url" content="${url}" />`);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);

  if (noindex) {
    html = html.replace("</head>", () => `  <meta name="robots" content="noindex, nofollow" />\n  </head>`);
  }

  const outDir = routePath === "/" ? distDir : path.join(distDir, routePath);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  console.log("prerendered", routePath, noindex ? "(noindex)" : "");
}

const indexable = ROUTES.filter(({ path: routePath }) => !NOT_IN_SITEMAP.has(routePath));

const today = new Date().toISOString().slice(0, 10);
const urlEntries = indexable.map(({ path: routePath }) => {
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
console.log("wrote sitemap.xml with", indexable.length, "urls");

// llms.txt: a plain-text map of the site for AI assistants (see llmstxt.org).
const llmsPages = indexable
  .map(({ path: routePath, title, description }) => `- [${title}](${SITE_URL}${routePath}): ${description}`)
  .join("\n");
const llms = `# Aurum Ventura Enterprise LLC

> Outsourced back-office administrative services for small and growing businesses across the United States. Based in Nashville, TN. Recurring, custom-scoped support for document preparation, invoicing, vendor administration, CRM data, license tracking, and project administration.

## Pages

${llmsPages}

## Contact

- Phone: +1-850-653-7797
- Email: admin@aurumventura.net
`;
fs.writeFileSync(path.join(distDir, "llms.txt"), llms);
console.log("wrote llms.txt");

// Sets a <meta> tag's content, replacing whichever tag the template has for it.
function setMeta(html, attr, name, content) {
  const re = new RegExp(`<meta ${attr}="${name}" content="[^"]*"\\s*/?>`);
  return html.replace(re, () => `<meta ${attr}="${name}" content="${escapeHtml(content)}" />`);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
