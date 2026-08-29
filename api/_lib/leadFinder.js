// Lead Finder Agent — discovery logic.
//
// Data source: OpenStreetMap, via the free, no-API-key Nominatim
// (geocoding) and Overpass (business/POI search) public endpoints. This
// was chosen because it needs no billing account or API key to get
// running (see the "free discovery source" decision) — the tradeoff is
// coverage/data quality are weaker than a paid provider like Google
// Places, and many results will be missing phone/website. That's
// reflected honestly in the dashboard (fields just come back null)
// rather than invented.
//
// Nominatim/Overpass usage policy requires a descriptive User-Agent and
// asks callers not to hammer the endpoints — one request per job step,
// triggered by cron or an admin's "Run Next Step" click, comfortably
// respects that.
const USER_AGENT = "AurumVenturaAgentOps/1.0 (internal lead discovery; contact: kylej312@gmail.com)";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Very small map from a free-text "industry" to OSM tags worth querying.
// Falls back to a generic name-text search if nothing matches.
const INDUSTRY_TAG_MAP = [
  { match: /property management|real estate/i, tags: ['["office"="estate_agent"]', '["office"="property_management"]'] },
  { match: /construction|contractor|builder/i, tags: ['["office"="construction_company"]', '["craft"="builder"]'] },
  { match: /landscap/i, tags: ['["craft"="gardener"]', '["shop"="garden_centre"]'] },
  { match: /law|attorney|legal/i, tags: ['["office"="lawyer"]'] },
  { match: /account|bookkeep|cpa/i, tags: ['["office"="accountant"]'] },
  { match: /insurance/i, tags: ['["office"="insurance"]'] },
  { match: /dental|dentist/i, tags: ['["amenity"="dentist"]'] },
  { match: /medical|clinic|doctor|physician/i, tags: ['["amenity"="doctors"]', '["amenity"="clinic"]'] },
  { match: /restaurant|cafe|food/i, tags: ['["amenity"="restaurant"]', '["amenity"="cafe"]'] },
  { match: /auto|mechanic|car repair/i, tags: ['["shop"="car_repair"]'] },
  { match: /hvac|plumb|electric/i, tags: ['["craft"="plumber"]', '["craft"="hvac"]', '["craft"="electrician"]'] },
];

function tagsForIndustry(industry) {
  const hit = INDUSTRY_TAG_MAP.find((row) => row.match.test(industry || ""));
  return hit ? hit.tags : null;
}

async function fetchJson(url, opts) {
  const res = await fetch(url, { ...opts, headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...(opts?.headers || {}) } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`${url} responded ${res.status}: ${body.slice(0, 300)}`), { code: "DISCOVERY_HTTP_ERROR", status: res.status });
  }
  return res.json();
}

// Geocode a free-text location ("Nashville, TN") to a lat/lon + a
// bounding box Overpass can search within.
export async function geocodeLocation(location) {
  const params = new URLSearchParams({ q: location, format: "json", limit: "1" });
  const results = await fetchJson(`${NOMINATIM_URL}?${params.toString()}`);
  if (!results.length) {
    throw Object.assign(new Error(`Could not geocode location "${location}"`), { code: "GEOCODE_NOT_FOUND" });
  }
  const r = results[0];
  return {
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    boundingBox: r.boundingbox.map(Number), // [south, north, west, east]
    displayName: r.display_name,
  };
}

// One discovery "batch" for a job: given a geocoded location + industry,
// query Overpass for matching businesses. Returns raw candidate rows;
// caller (run-step endpoint) is responsible for de-duplication/limits.
export async function discoverBusinesses({ industry, location }) {
  const geo = await geocodeLocation(location);
  const tags = tagsForIndustry(industry) || ['["name"]']; // generic fallback: anything named, filtered by name text below
  const [south, north, west, east] = geo.boundingBox;
  const bbox = `${south},${west},${north},${east}`;

  const nameFilter = tagsForIndustry(industry) ? "" : `[~"name"~"${industry.replace(/["\\]/g, "")}",i]`;
  const clauses = tags.map((tag) => `node${tag}${nameFilter}(${bbox});way${tag}${nameFilter}(${bbox});`).join("\n  ");
  const query = `
    [out:json][timeout:25];
    (
      ${clauses}
    );
    out center 60;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "User-Agent": USER_AGENT, "Content-Type": "text/plain" },
    body: query,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`Overpass responded ${res.status}: ${body.slice(0, 300)}`), { code: "DISCOVERY_HTTP_ERROR", status: res.status });
  }
  const data = await res.json();

  const seen = new Set();
  const candidates = [];
  for (const el of data.elements || []) {
    const name = el.tags?.name;
    if (!name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const addressParts = [el.tags?.["addr:housenumber"], el.tags?.["addr:street"], el.tags?.["addr:city"], el.tags?.["addr:state"]].filter(Boolean);
    candidates.push({
      businessName: name,
      address: addressParts.length ? addressParts.join(" ") : null,
      phone: el.tags?.phone || el.tags?.["contact:phone"] || null,
      website: el.tags?.website || el.tags?.["contact:website"] || null,
      sourceRef: key,
      lat,
      lon,
    });
  }
  return { candidates, geo };
}

export function dedupeKeyFor(businessName, location) {
  const norm = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
  return `${norm(businessName)}::${norm(location)}`;
}
