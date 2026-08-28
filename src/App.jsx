import { useState, useEffect, useRef } from "react";

const COLORS = {
  navy: "#041944",
  teal: "#09748B",
  aqua: "#26AEB4",
  ice: "#E6F3F9",
  slate: "#57677F",
  white: "#FFFFFF",
};

export const SERVICES = [
  {
    slug: "document-preparation-management",
    title: "Document Preparation & Management",
    summary: "We organize your existing business documents, maintain a clean digital filing system, and prepare routine administrative documents — trackers, checklists, internal forms, and reports — from information you provide.",
    examples: [
      "Setting up a consistent folder structure across your business documents",
      "Preparing a weekly operations checklist from your notes",
      "Compiling a monthly summary report from data you provide",
    ],
  },
  {
    slug: "invoice-administration",
    title: "Invoice Administration",
    summary: "We prepare and send invoices when authorized, record payment status, track issue and due dates, and keep your invoice records organized and current. We do not perform debt collection.",
    examples: [
      "Preparing and sending an invoice once you approve the amount and recipient",
      "Logging payment status and flagging invoices approaching their due date",
      "Maintaining a running invoice log by client or job",
    ],
  },
  {
    slug: "license-renewal-tracking",
    title: "License & Renewal Tracking",
    summary: "We record your licenses, permits, registrations, certifications, and insurance documentation, then track expiration and renewal dates so nothing quietly lapses. We track this information administratively — we do not determine what your business legally requires.",
    examples: [
      "Building a renewal calendar for your business license, permits, and certifications",
      "Sending you a reminder ahead of an upcoming expiration date",
      "Filing renewal confirmations and updated documents as they come in",
    ],
  },
  {
    slug: "vendor-administration",
    title: "Vendor Administration",
    summary: "We maintain vendor contact records, organize W-9s and Certificates of Insurance, track insurance expiration dates, and prepare routine vendor paperwork using information you approve.",
    examples: [
      "Building and maintaining a vendor contact directory",
      "Collecting and organizing W-9s and Certificates of Insurance",
      "Flagging a vendor's insurance certificate before it lapses",
    ],
  },
  {
    slug: "crm-data-management",
    title: "CRM & Data Management",
    summary: "We enter and update customer and vendor records, clean up duplicates, maintain spreadsheets, and handle routine data entry so your systems stay accurate.",
    examples: [
      "Entering new customer records into your CRM after a sale closes",
      "Cleaning up duplicate or outdated contact entries",
      "Updating spreadsheets with information you send over",
    ],
  },
  {
    slug: "project-administration",
    title: "Project Administration",
    summary: "We create and maintain project folders and trackers, organize project documents, update project status, and prepare routine administrative reports for work in progress.",
    examples: [
      "Setting up a project folder and tracker for a new job",
      "Updating status fields as a project moves through its stages",
      "Preparing a weekly progress summary for work in progress",
    ],
  },
  {
    slug: "forms-paperwork",
    title: "Forms & Paperwork",
    summary: "We prepare routine business forms, applications, checklists, and internal paperwork using information you provide. Anything requiring licensed professional judgment is handled by the appropriate qualified professional — not by us.",
    examples: [
      "Filling out a routine application form with information you supply",
      "Preparing an internal checklist for a recurring process",
      "Formatting and organizing paperwork ahead of a deadline",
    ],
  },
  {
    slug: "data-entry-reporting",
    title: "Data Entry & Reporting",
    summary: "Spreadsheets, data cleanup, status reports, and monthly operational summaries — the recurring reporting that keeps you informed without consuming your time.",
    examples: [
      "Entering weekly sales or job data into a tracking spreadsheet",
      "Cleaning up and standardizing an existing spreadsheet",
      "Preparing a monthly operational summary report",
    ],
  },
  {
    slug: "general-administrative-support",
    title: "General Administrative Support",
    summary: "Routine administrative work within your approved Scope of Services. Every plan has a defined scope and reserved capacity, which protects both sides of the relationship.",
    examples: [
      "Handling day-to-day administrative requests within your approved scope",
      "Coordinating routine tasks that don't fit neatly into one category",
      "Flagging anything outside scope for your approval before it begins",
    ],
  },
];

const AUDIENCE = [
  "Service businesses", "Property management", "Real estate", "Hospitality & restaurants",
  "Cleaning & landscaping", "Contractors", "Retailers", "Professional service firms",
];

const STEPS = [
  ["Consultation", "A short conversation to understand where administrative work is creating strain."],
  ["Needs Assessment", "We document what's actually taking time and where a defined scope would help."],
  ["Proposal", "A written recommendation — plan, scope, and reserved capacity."],
  ["Agreement & Scope", "The Master Agreement and your Scope & Service Level Exhibit are signed."],
  ["Onboarding", "Intake forms, document transfer, and system access are set up — typically 5–10 business days."],
  ["Active Service", "Requests go through, tracked against capacity, with a monthly report on what moved."],
];

const NOT_LIST = [
  "Cold calling or lead generation",
  "Debt collection",
  "Legal, tax, or accounting advice",
  "Compliance guarantees or regulatory determinations",
];

const TIME_SINKS = [
  { label: "Paperwork", slug: "forms-paperwork" },
  { label: "Invoices", slug: "invoice-administration" },
  { label: "Vendor Files", slug: "vendor-administration" },
  { label: "Renewals", slug: "license-renewal-tracking" },
  { label: "CRM & Data", slug: "crm-data-management" },
  { label: "Project Admin", slug: "project-administration" },
];

const INDUSTRY_EXAMPLES = {
  "Service businesses": ["Invoice administration", "CRM & data updates", "Recurring status reporting", "Forms & paperwork"],
  "Property management": ["Property & vendor records", "Vendor documentation", "Monthly reporting", "CRM updates"],
  "Real estate": ["Transaction paperwork", "Document organization", "CRM updates", "Vendor records"],
  "Hospitality & restaurants": ["Vendor administration", "Invoice records", "License & renewal tracking", "Forms & paperwork"],
  "Cleaning & landscaping": ["Vendor records", "Invoice administration", "Project administration", "Scheduling paperwork"],
  "Contractors": ["Certificates of insurance", "Vendor records", "Project documents", "License tracking"],
  "Retailers": ["Vendor administration", "Invoice records", "Data entry", "Recurring reporting"],
  "Professional service firms": ["CRM updates", "Document management", "Invoice administration", "Status reporting"],
};

// Fades an element in as it scrolls into view. Content already visible on
// load (or any element, before JS runs at all) stays fully visible — this
// only ever hides something after confirming, client-side, that it's below
// the fold. No effect on the prerendered/no-JS HTML crawlers see.
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return; // already visible, skip
    el.classList.add("reveal-pending");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("reveal-in");
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// Real, shareable URLs for every page. Home/Services/About/Contact map to
// fixed paths; anything else is treated as a service slug under /services/.
export function pathFor(key) {
  switch (key) {
    case "Home": return "/";
    case "Services": return "/services";
    case "About": return "/about";
    case "Contact": return "/contact";
    default: return "/services/" + key;
  }
}

export function pageFromPath(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "Home";
  if (path === "/services") return "Services";
  if (path === "/about") return "About";
  if (path === "/contact") return "Contact";
  const match = path.match(/^\/services\/([^/]+)$/);
  if (match && SERVICES.some((s) => s.slug === match[1])) return match[1];
  return "Home";
}

function Swoosh({ style }) {
  return (
    <svg viewBox="0 0 600 200" style={style} preserveAspectRatio="none">
      <path
        d="M 0 140 C 150 40, 300 180, 450 60 C 500 25, 550 20, 600 40"
        fill="none"
        stroke="url(#swooshGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="swooshGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={COLORS.navy} stopOpacity="0.55" />
          <stop offset="55%" stopColor={COLORS.teal} />
          <stop offset="100%" stopColor={COLORS.aqua} />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Nav({ page, setPage }) {
  const items = ["Home", "Services", "About"];
  const [open, setOpen] = useState(false);
  const isServiceDetail = SERVICES.some((s) => s.slug === page);
  const isActive = (it) => page === it || (it === "Services" && isServiceDetail);
  const go = (key, closeMenu) => (e) => {
    e.preventDefault();
    setPage(key);
    if (closeMenu) setOpen(false);
  };
  return (
    <header className="nav">
      <div className="nav-inner">
        <a className="nav-brand" href={pathFor("Home")} onClick={go("Home", true)}>
          <img src="/logo-mark.png" alt="Aurum Ventura" className="nav-mark" width="47" height="34" />
          <span className="nav-word">
            Aurum Ventura
            <small>Business Administrative Services</small>
          </span>
        </a>
        <nav className="nav-links">
          {items.map((it) => (
            <a
              key={it}
              className={"nav-link" + (isActive(it) ? " active" : "")}
              href={pathFor(it)}
              onClick={go(it)}
            >
              {it}
            </a>
          ))}
          <a
            className={"nav-cta" + (page === "Contact" ? " active" : "")}
            href={pathFor("Contact")}
            onClick={go("Contact")}
          >
            Request a Consultation
          </a>
        </nav>
        <button
          className="nav-burger"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="nav-mobile-menu"
        >
          <span /><span /><span />
        </button>
      </div>
      {open && (
        <div className="nav-mobile" id="nav-mobile-menu">
          {items.map((it) => (
            <a
              key={it}
              className={"nav-mobile-link" + (isActive(it) ? " active" : "")}
              href={pathFor(it)}
              onClick={go(it, true)}
            >
              {it}
            </a>
          ))}
          <a
            className={"nav-mobile-link nav-mobile-cta" + (page === "Contact" ? " active" : "")}
            href={pathFor("Contact")}
            onClick={go("Contact", true)}
          >
            Request a Consultation
          </a>
        </div>
      )}
    </header>
  );
}

function Footer({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-cols">
          <div>
            <h3>Company</h3>
            <a href={pathFor("About")} onClick={go("About")}>About</a>
            <a href={pathFor("Services")} onClick={go("Services")}>Services</a>
          </div>
          <div>
            <h3>Get in touch</h3>
            <a href={pathFor("Contact")} onClick={go("Contact")}>Request a Consultation</a>
            <p className="footer-contact">[BUSINESS EMAIL]</p>
            <p className="footer-contact">[BUSINESS PHONE]</p>
          </div>
        </div>
      </div>
      <Swoosh style={{ width: "140px", height: "46px", opacity: 0.5, margin: "0 auto" }} />
      <p className="footer-legal">
        &copy; {new Date().getFullYear()} Aurum Ventura Enterprise LLC. Business Administrative Services.
      </p>
    </footer>
  );
}

function IndustryPanel() {
  const [active, setActive] = useState(0);
  return (
    <>
      <div className="tag-list">
        {AUDIENCE.map((a, i) => (
          <button
            key={a}
            type="button"
            className={"tag tag-toggle" + (i === active ? " selected" : "")}
            onClick={() => setActive(i)}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="industry-panel">
        <p className="industry-panel-label">Examples for {AUDIENCE[active]}</p>
        <ul className="plain-list industry-examples">
          {INDUSTRY_EXAMPLES[AUDIENCE[active]].map((ex) => <li key={ex}>{ex}</li>)}
        </ul>
      </div>
    </>
  );
}

function TimeSelector({ setPage }) {
  const [selected, setSelected] = useState([]);
  const toggle = (slug) =>
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));
  const go = (e) => {
    e.preventDefault();
    const labels = TIME_SINKS.filter((t) => selected.includes(t.slug)).map((t) => t.label);
    const query = labels.length ? `?areas=${encodeURIComponent(labels.join(", "))}` : "";
    setPage("Contact", query);
  };
  return (
    <section className="cta-band">
      <h2>What&rsquo;s taking up your time?</h2>
      <p>Select what&rsquo;s eating your week — we&rsquo;ll tell you what we can take off your plate.</p>
      <div className="tag-list selector-tags">
        {TIME_SINKS.map((t) => (
          <button
            key={t.slug}
            type="button"
            className={"tag tag-toggle" + (selected.includes(t.slug) ? " selected" : "")}
            onClick={() => toggle(t.slug)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="selector-response">
        {selected.length === 0
          ? "Pick a few areas above to see what we can take off your plate."
          : `Aurum Ventura can take ${selected.length} of those administrative area${selected.length > 1 ? "s" : ""} off your plate.`}
      </p>
      <a className="btn-primary" href={pathFor("Contact")} onClick={go}>Discuss My Administrative Needs &rarr;</a>
    </section>
  );
}

function ProcessSteps() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef([]);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setActive(STEPS.length);
      return;
    }
    const observers = STEPS.map((_, i) => {
      const el = stepRefs.current[i];
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActive((a) => Math.max(a, i + 1));
            obs.disconnect();
          }
        },
        { threshold: 0.4 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o && o.disconnect());
  }, []);

  return (
    <div className="steps">
      <div className="workflow-track" aria-hidden="true">
        <div className="workflow-fill" style={{ height: `${(active / STEPS.length) * 100}%` }} />
      </div>
      {STEPS.map(([title, text], i) => (
        <div
          className={"step" + (i < active ? " step-active" : "")}
          key={title}
          ref={(el) => (stepRefs.current[i] = el)}
        >
          <div className="step-num">{i + 1}</div>
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function HomePage({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  const handleRef = useReveal();
  const audienceRef = useReveal();
  const notRef = useReveal();
  return (
    <div>
      <section className="hero">
        <Swoosh style={{ position: "absolute", top: "8%", right: "-5%", width: "560px", height: "220px", opacity: 0.35, zIndex: 0 }} />
        <div className="hero-inner">
          <p className="kicker">Business Administrative Services</p>
          <h1>Your Business.<br />Our Back Office.</h1>
          <p className="hero-sub">
            Aurum Ventura Enterprise LLC is an outsourced administrative back office for small and
            growing businesses — documents, invoices, license and renewal tracking, vendor files,
            data entry, and routine reporting, handled within a defined scope and reserved capacity.
          </p>
          <div className="hero-cta">
            <a className="btn-text" href={pathFor("Services")} onClick={go("Services")}>See our services &rarr;</a>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 ref={handleRef}>What We Handle</h2>
        <div className="plain-grid">
          {SERVICES.map((s, i) => (
            <a className="plain-grid-item" key={s.slug} href={pathFor(s.slug)} onClick={go(s.slug)}>
              <span className="plain-num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.title}</h3>
            </a>
          ))}
        </div>
      </section>

      <section className="section alt">
        <h2 ref={audienceRef}>Who We Work With</h2>
        <p className="section-lead">
          Businesses with real administrative volume but no dedicated staff to own it —
          growing operations that need consistency, not a full-time hire. Select an industry to
          see examples of what we handle.
        </p>
        <IndustryPanel />
        <a className="btn-text" href={pathFor("Services")} onClick={go("Services")}>See the full list of services &rarr;</a>
      </section>

      <section className="section">
        <h2 ref={notRef}>What We're Not</h2>
        <p className="section-lead">
          We're an administrative back office, not a virtual assistant marketplace, a law firm,
          or an accounting firm. To keep that boundary clear, we don't provide:
        </p>
        <ul className="plain-list">
          {NOT_LIST.map((n) => <li key={n}>{n}</li>)}
        </ul>
        <a className="btn-text" href={pathFor("About")} onClick={go("About")}>Learn how we work &rarr;</a>
      </section>

      <TimeSelector setPage={setPage} />
    </div>
  );
}

function ServiceRow({ slug, index, setPage }) {
  const service = SERVICES.find((s) => s.slug === slug);
  const ref = useReveal();
  const go = (e) => { e.preventDefault(); setPage(slug); };
  return (
    <a className="service-row" href={pathFor(slug)} onClick={go} ref={ref}>
      <h2>{String(index + 1).padStart(2, "0")} &middot; {service.title}</h2>
      <p>{service.summary}</p>
      <span className="service-row-link">View examples &rarr;</span>
    </a>
  );
}

function ServicesPage({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  return (
    <div>
      <section className="page-head">
        <p className="kicker">Services</p>
        <h1>What We Do</h1>
        <p className="hero-sub">
          Our services fall into nine core categories. Your Scope of Services is built from the
          categories you actually need — you're never paying for the ones you don't.
        </p>
      </section>
      <section className="section">
        {SERVICES.map((s, i) => (
          <ServiceRow key={s.slug} slug={s.slug} index={i} setPage={setPage} />
        ))}
      </section>
      <section className="section alt">
        <h2>What We Don't Do</h2>
        <ul className="plain-list">
          {NOT_LIST.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </section>
      <section className="cta-band">
        <h2>Not sure which categories apply?</h2>
        <p>We'll work it out together in a short consultation.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Request a Consultation</a>
      </section>
    </div>
  );
}

function ServiceDetailPage({ slug, setPage }) {
  const index = SERVICES.findIndex((s) => s.slug === slug);
  const service = SERVICES[index] || SERVICES[0];
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  return (
    <div>
      <section className="page-head">
        <a className="btn-text back-link" href={pathFor("Services")} onClick={go("Services")}>&larr; All Services</a>
        <p className="kicker">{String(index + 1).padStart(2, "0")} &middot; Services</p>
        <h1>{service.title}</h1>
        <p className="hero-sub">{service.summary}</p>
      </section>
      <section className="section">
        <h2>Examples of This Work</h2>
        <ul className="plain-list">
          {service.examples.map((ex) => <li key={ex}>{ex}</li>)}
        </ul>
      </section>
      <section className="cta-band">
        <h2>Want this handled for you?</h2>
        <p>We'll fold it into a Scope of Services built around what you actually need.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Request a Consultation</a>
      </section>
    </div>
  );
}

function AboutPage({ setPage }) {
  const processRef = useReveal();
  const staysRef = useReveal();
  return (
    <div>
      <section className="page-head">
        <p className="kicker">About</p>
        <h1>How We Work</h1>
        <p className="hero-sub">
          Aurum Ventura Enterprise LLC handles the administrative work that accumulates behind a
          growing business — organized within a defined scope, tracked against reserved capacity,
          and reported on every month. You stay responsible for the business decisions; we keep
          the paperwork moving.
        </p>
      </section>
      <section className="section">
        <h2 ref={processRef}>Our Process</h2>
        <ProcessSteps />
      </section>
      <section className="section alt">
        <h2 ref={staysRef}>What Stays With You</h2>
        <p className="section-lead">
          You retain ownership and control of your accounts, systems, and business decisions at
          all times. We execute administrative work based on what you tell us — the underlying
          decisions, and your legal and regulatory obligations, stay with you.
        </p>
      </section>
      <section className="cta-band">
        <h2>Ready to talk?</h2>
        <p>A short consultation to see if this is a fit — no pressure, no commitment.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={(e) => { e.preventDefault(); setPage("Contact"); }}>Request a Consultation</a>
      </section>
    </div>
  );
}

function ContactPage() {
  const [form, setForm] = useState({ name: "", business: "", email: "", phone: "", type: "", message: "" });
  const [sent, setSent] = useState(false);

  // Prefill from ?areas= when arriving via the "What's taking up your time?"
  // selector. Done client-side, post-mount, on purpose — the prerendered
  // static HTML for /contact never includes a query string, so applying
  // this during render (instead of after) would mismatch on hydration.
  useEffect(() => {
    const areas = new URLSearchParams(window.location.search).get("areas");
    if (areas) {
      setForm((f) => (f.message ? f : { ...f, message: `I need help with: ${areas}.` }));
    }
  }, []);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  if (sent) {
    return (
      <section className="page-head">
        <p className="kicker">Contact</p>
        <h1>Request Received</h1>
        <p className="hero-sub">
          Thanks, {form.name || "there"} — we'll follow up at {form.email || "the email you provided"} to
          set up a time to talk.
        </p>
      </section>
    );
  }

  return (
    <div>
      <section className="page-head">
        <p className="kicker">Contact</p>
        <h1>Request a Consultation</h1>
        <p className="hero-sub">
          Tell us a bit about your business and what administrative work is taking your time.
          We'll follow up to set up a short call.
        </p>
      </section>
      <section className="section">
        <div className="contact-grid">
          <form className="contact-form" onSubmit={submit}>
            <label>
              Name
              <input required value={form.name} onChange={update("name")} />
            </label>
            <label>
              Business Name
              <input required value={form.business} onChange={update("business")} />
            </label>
            <div className="form-row">
              <label>
                Email
                <input type="email" required value={form.email} onChange={update("email")} />
              </label>
              <label>
                Phone
                <input type="tel" value={form.phone} onChange={update("phone")} />
              </label>
            </div>
            <label>
              Business Type
              <select value={form.type} onChange={update("type")}>
                <option value="">Select one</option>
                <option>Service business</option>
                <option>Property management</option>
                <option>Real estate</option>
                <option>Hospitality / restaurant</option>
                <option>Cleaning / landscaping</option>
                <option>Contractor</option>
                <option>Retail</option>
                <option>Professional services</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              What administrative work is taking your time?
              <textarea rows={4} value={form.message} onChange={update("message")} />
            </label>
            <button className="btn-primary" type="submit">Send Request</button>
          </form>
          <div className="contact-side">
            <h2>Direct Contact</h2>
            <p>[BUSINESS EMAIL]</p>
            <p>[BUSINESS PHONE]</p>
            <h2>Typical Response</h2>
            <p>Within one business day.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export const SITE_NAME = "Aurum Ventura Enterprise LLC";
const PAGE_TITLES = {
  Home: `${SITE_NAME} — Business Administrative Services`,
  Services: `Services — ${SITE_NAME}`,
  About: `About — ${SITE_NAME}`,
  Contact: `Contact — ${SITE_NAME}`,
};
const PAGE_DESCRIPTIONS = {
  Home: "Outsourced administrative back-office support for small and growing businesses.",
  Services: "Nine core categories of administrative support — document prep, invoicing, license tracking, vendor admin, data management, and more.",
  About: "How Aurum Ventura works: a defined scope, reserved monthly capacity, and a monthly report on what moved.",
  Contact: "Request a consultation to see where administrative work is taking your time.",
};

// Title + meta description for a given page key or service slug — shared
// between the client (document.title) and the static prerender step.
export function metaFor(page) {
  if (PAGE_TITLES[page]) return { title: PAGE_TITLES[page], description: PAGE_DESCRIPTIONS[page] };
  const service = SERVICES.find((s) => s.slug === page);
  if (service) return { title: `${service.title} — ${SITE_NAME}`, description: service.summary };
  return { title: PAGE_TITLES.Home, description: PAGE_DESCRIPTIONS.Home };
}

export default function App({ initialPath } = {}) {
  const [page, setPage] = useState(() =>
    pageFromPath(initialPath ?? (typeof window !== "undefined" ? window.location.pathname : "/"))
  );

  // Keeps the browser URL in sync with the current page — real, shareable
  // links, plus back/forward support via the popstate listener below.
  // `search` lets a caller (e.g. the time selector) attach a query string
  // (?areas=...) in the same pushState call, rather than pushing it
  // separately beforehand only to have this overwrite it.
  const navigate = (key, search = "") => {
    if (key !== page || search) window.history.pushState({}, "", pathFor(key) + search);
    setPage(key);
  };

  useEffect(() => {
    const onPopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    const { title, description } = metaFor(page);
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
  }, [page]);

  const pages = {
    Home: <HomePage setPage={navigate} />,
    Services: <ServicesPage setPage={navigate} />,
    About: <AboutPage setPage={navigate} />,
    Contact: <ContactPage />,
  };
  const service = SERVICES.find((s) => s.slug === page);
  const content = pages[page] || (service ? <ServiceDetailPage slug={page} setPage={navigate} /> : pages.Home);

  return (
    <div className="app">
      {/* dangerouslySetInnerHTML (not a text child) so SSR's HTML-escaping
          of this raw CSS string doesn't mismatch the client's hydration —
          browsers treat <style> content as raw text, unescaped. */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; }
        .app {
          font-family: 'Montserrat', sans-serif;
          color: ${COLORS.navy};
          background: ${COLORS.white};
          min-height: 100vh;
        }
        h1, h2, h3 {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
          color: ${COLORS.navy};
          margin: 0;
        }
        h1 { font-size: clamp(2.2rem, 5vw, 3.4rem); line-height: 1.1; }
        h2 { font-size: clamp(1.5rem, 3vw, 2rem); margin-bottom: 1rem; }
        h3 { font-size: 1.25rem; margin-bottom: 0.4rem; }
        p { line-height: 1.65; color: ${COLORS.slate}; margin: 0; }
        button { font-family: inherit; cursor: pointer; }
        a { color: inherit; text-decoration: none; cursor: pointer; }

        .reveal-pending { opacity: 0; transform: translateY(18px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal-pending.reveal-in { opacity: 1; transform: translateY(0); }

        .kicker {
          font-size: 0.78rem; font-weight: 600; letter-spacing: 0.14em;
          text-transform: uppercase; color: ${COLORS.teal}; margin: 0 0 0.7rem;
        }

        /* Nav */
        .nav { position: sticky; top: 0; background: ${COLORS.white}; border-bottom: 1px solid #E4E9EF; z-index: 50; }
        .nav-inner { max-width: 1100px; margin: 0 auto; padding: 0.9rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
        .nav-brand { display: flex; align-items: center; gap: 0.6rem; background: none; border: none; padding: 0; }
        .nav-mark { height: 34px; width: auto; }
        .nav-word { font-family: 'Cormorant Garamond', serif; font-size: 1.05rem; font-weight: 600; color: ${COLORS.navy}; text-align: left; line-height: 1.15; }
        .nav-word small { display: block; font-family: 'Montserrat', sans-serif; font-size: 0.6rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: ${COLORS.slate}; }
        .nav-links { display: flex; align-items: center; gap: 2rem; }
        .nav-link { background: none; border: none; font-size: 0.88rem; font-weight: 500; color: ${COLORS.slate}; padding: 0.3rem 0; border-bottom: 2px solid transparent; }
        .nav-link.active, .nav-link:hover { color: ${COLORS.navy}; border-bottom-color: ${COLORS.aqua}; }
        .nav-cta { background: ${COLORS.navy}; color: ${COLORS.white}; border: none; padding: 0.6rem 1.2rem; font-size: 0.82rem; font-weight: 600; letter-spacing: 0.02em; }
        .nav-cta:hover, .nav-cta.active { background: ${COLORS.teal}; }
        .nav-burger { display: none; flex-direction: column; gap: 4px; background: none; border: none; padding: 0.4rem; }
        .nav-burger span { width: 22px; height: 2px; background: ${COLORS.navy}; }
        .nav-mobile { display: none; }

        @media (max-width: 768px) {
          .nav-links { display: none; }
          .nav-burger { display: flex; }
          .nav-mobile { display: flex; flex-direction: column; border-top: 1px solid #E4E9EF; padding: 0.5rem 1.5rem 1rem; }
          .nav-mobile-link { text-align: left; background: none; border: none; padding: 0.6rem 0; font-size: 0.95rem; color: ${COLORS.slate}; }
          .nav-mobile-link.active { color: ${COLORS.navy}; font-weight: 600; }
          .nav-mobile-cta { color: ${COLORS.navy}; font-weight: 600; margin-top: 0.4rem; }
          .nav-mobile-cta.active { color: ${COLORS.teal}; }
        }

        /* Hero */
        .hero { position: relative; overflow: hidden; padding: 4rem 1.5rem 3rem; }
        .hero-inner { max-width: 1100px; margin: 0 auto; position: relative; z-index: 1; max-width: 640px; }
        .hero-sub { font-size: 1.02rem; margin: 1rem 0 1.6rem; max-width: 560px; }
        .hero-cta { display: flex; align-items: center; gap: 1.2rem; flex-wrap: wrap; }

        .btn-primary { display: inline-block; background: ${COLORS.navy}; color: ${COLORS.white}; border: none; padding: 0.85rem 1.7rem; font-size: 0.9rem; font-weight: 600; letter-spacing: 0.02em; }
        .btn-primary:hover { background: ${COLORS.teal}; }
        .btn-text { display: inline-block; background: none; border: none; color: ${COLORS.teal}; font-size: 0.9rem; font-weight: 600; padding: 0.5rem 0; }
        .btn-text:hover { color: ${COLORS.navy}; }

        /* Sections */
        .section { max-width: 1100px; margin: 0 auto; padding: 2.6rem 1.5rem; }
        .section.alt { background: ${COLORS.ice}; max-width: none; }
        .section.alt > * { max-width: 1100px; margin-left: auto; margin-right: auto; }
        .section-lead { max-width: 620px; margin-bottom: 0.8rem; }
        .page-head { max-width: 1100px; margin: 0 auto; padding: 2.8rem 1.5rem 0.5rem; }
        .page-head .hero-sub { max-width: 640px; margin-bottom: 0.5rem; }
        .page-head + .section { padding-top: 1.6rem; }

        .plain-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.1rem 2.5rem; margin: 1.1rem 0 1.3rem; }
        .plain-grid-item { display: flex; gap: 0.7rem; align-items: baseline; padding: 0.6rem 0; border-bottom: 1px solid #E4E9EF; font-size: 0.92rem; color: ${COLORS.navy}; width: 100%; background: none; border-left: none; border-right: none; border-top: none; text-align: left; font-family: inherit; cursor: pointer; }
        .plain-grid-item:hover { color: ${COLORS.teal}; border-bottom-color: ${COLORS.teal}; }
        .plain-grid-item h3 { font: inherit; font-weight: inherit; color: inherit; margin: 0; }
        .plain-num { color: ${COLORS.teal}; font-weight: 600; font-size: 0.8rem; }
        @media (max-width: 640px) { .plain-grid { grid-template-columns: 1fr; } }

        .tag-list { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1rem; }
        .tag { border: 1px solid ${COLORS.teal}; color: ${COLORS.teal}; font-size: 0.82rem; font-weight: 500; padding: 0.35rem 0.9rem; }
        .tag-toggle { background: none; font-family: inherit; cursor: pointer; transition: background 0.2s ease, color 0.2s ease; }
        .tag-toggle.selected { background: ${COLORS.teal}; color: ${COLORS.white}; }

        .industry-panel { margin-top: 1.3rem; padding-top: 1.1rem; border-top: 1px solid #E4E9EF; max-width: 560px; }
        .industry-panel-label { font-size: 0.78rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: ${COLORS.teal}; margin-bottom: 0.5rem; }
        .industry-examples { margin-top: 0; }

        .plain-list { margin: 0.8rem 0 0; padding-left: 1.2rem; color: ${COLORS.slate}; }
        .plain-list li { margin-bottom: 0.5rem; line-height: 1.5; }

        .cta-band { text-align: center; padding: 2.8rem 1.5rem; border-top: 1px solid #E4E9EF; }
        .cta-band h2 { margin-bottom: 0.5rem; }
        .cta-band p { margin-bottom: 1.1rem; }
        .selector-tags { justify-content: center; max-width: 560px; margin-left: auto; margin-right: auto; }
        .cta-band p.selector-response { font-weight: 600; color: ${COLORS.navy}; margin: 1.1rem 0 1.2rem; }

        .service-row { display: block; padding: 1.1rem 0; border-bottom: 1px solid #E4E9EF; max-width: 720px; width: 100%; background: none; border-left: none; border-right: none; border-top: none; text-align: left; font-family: inherit; cursor: pointer; }
        .service-row:first-child { padding-top: 0; }
        .service-row h2 { font-size: 1.25rem; margin-bottom: 0.4rem; }
        .service-row-link { display: inline-block; margin-top: 0.5rem; color: ${COLORS.teal}; font-size: 0.85rem; font-weight: 600; }
        .service-row:hover h2 { color: ${COLORS.teal}; }
        .service-row:hover .service-row-link { color: ${COLORS.navy}; }

        .back-link { display: inline-block; margin-bottom: 1rem; }

        /* Steps */
        .steps { position: relative; display: flex; flex-direction: column; gap: 1.3rem; max-width: 640px; }
        .step { position: relative; display: flex; gap: 1.2rem; }
        .step-num { position: relative; z-index: 1; flex-shrink: 0; width: 34px; height: 34px; border: 1.5px solid ${COLORS.aqua}; color: ${COLORS.navy}; background: ${COLORS.white}; font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: background 0.4s ease, color 0.4s ease, border-color 0.4s ease; }
        .step-active .step-num { background: ${COLORS.teal}; border-color: ${COLORS.teal}; color: ${COLORS.white}; }
        .workflow-track { position: absolute; left: 16px; top: 4px; bottom: 4px; width: 2px; background: #E4E9EF; }
        .workflow-fill { width: 100%; background: ${COLORS.teal}; transition: height 0.5s ease; }

        /* Contact */
        .contact-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 2.5rem; }
        .contact-form { display: flex; flex-direction: column; gap: 1.1rem; }
        .contact-form label { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.82rem; font-weight: 600; color: ${COLORS.navy}; }
        .contact-form input, .contact-form select, .contact-form textarea {
          font-family: 'Montserrat', sans-serif; font-size: 0.92rem; padding: 0.6rem 0.7rem;
          border: 1px solid #C9D3DC; background: ${COLORS.white}; color: ${COLORS.navy};
        }
        .contact-form input:focus, .contact-form select:focus, .contact-form textarea:focus { outline: 2px solid ${COLORS.aqua}; outline-offset: 1px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .contact-side { border-left: 1px solid #E4E9EF; padding-left: 2rem; }
        .contact-side h2 { font-family: 'Montserrat', sans-serif; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: ${COLORS.teal}; margin: 1.4rem 0 0.4rem; }
        .contact-side h2:first-child { margin-top: 0; }
        .contact-side p { font-size: 0.9rem; color: ${COLORS.navy}; margin-bottom: 0.2rem; }
        @media (max-width: 700px) {
          .contact-grid { grid-template-columns: 1fr; }
          .contact-side { border-left: none; border-top: 1px solid #E4E9EF; padding-left: 0; padding-top: 1.5rem; }
          .form-row { grid-template-columns: 1fr; }
        }

        /* Footer */
        .footer { background: ${COLORS.navy}; color: ${COLORS.white}; padding: 3rem 1.5rem 1.5rem; margin-top: 1.5rem; }
        .footer-inner { max-width: 1100px; margin: 0 auto; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 2.5rem; padding-bottom: 1.5rem; }
        .footer-cols { display: flex; gap: 3.5rem; }
        .footer-cols h3 { font-family: 'Montserrat', sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${COLORS.aqua}; margin-bottom: 0.8rem; }
        .footer-cols a { display: block; background: none; border: none; color: rgba(255,255,255,0.8); font-size: 0.87rem; padding: 0.3rem 0; text-align: left; }
        .footer-cols a:hover { color: ${COLORS.white}; }
        .footer-contact { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 0.3rem; }
        .footer-legal { text-align: center; color: rgba(255,255,255,0.45); font-size: 0.78rem; margin-top: 1.2rem; }
      ` }} />

      <Nav page={page} setPage={navigate} />
      {content}
      <Footer setPage={navigate} />
    </div>
  );
}
