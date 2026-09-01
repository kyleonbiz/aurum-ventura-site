import { useState, useEffect, useRef } from "react";
import {
  CATEGORIES as UPLOAD_CATEGORIES,
  MIN_DESCRIPTION_LENGTH,
  MIN_REQUESTED_ACTION_LENGTH,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_UPLOAD,
  ALLOWED_EXTENSIONS,
  isValidEmail,
  isMeaningfulText,
  fileExtension,
  isAllowedExtension,
} from "../shared/uploadShared.js";
import {
  SYSTEM_OPTIONS,
  ADMIN_AREA_OPTIONS,
  CONTACT_METHODS,
  MIN_BUSINESS_NOTES_LENGTH,
  intakeValidationErrors,
} from "../shared/intakeShared.js";

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
  {
    slug: "business-file-reset",
    title: "Business File Reset",
    oneTime: true,
    summary: "A one-time cleanup and organization service designed to bring structure to your existing digital files, folders, and document systems. Every project is custom-scoped and quoted based on the condition and complexity of your current setup.",
    examples: [
      "Auditing and reorganizing a messy shared drive or folder structure",
      "Standardizing file and folder naming conventions across your business",
      "Archiving outdated files and consolidating duplicates into a clean system",
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
  ["Secure Onboarding", "Intake forms, document transfer, and system access are set up — typically 5–10 business days."],
  ["Active Service", "Requests go through, tracked against capacity, with a monthly report on what moved."],
];

const NOT_LIST = [
  "Cold calling or lead generation",
  "Debt collection",
  "Legal, tax, or accounting advice",
  "Compliance guarantees or regulatory determinations",
];

const TIME_COST = [
  ["Invoicing & payment follow-up", "2–3 hrs/wk"],
  ["Filing & document organization", "2 hrs/wk"],
  ["License & renewal tracking", "1 hr/wk"],
  ["Vendor paperwork & records", "1–2 hrs/wk"],
  ["Data entry & CRM updates", "2 hrs/wk"],
  ["Pulling together reports", "2 hrs/wk"],
];

const TESTIMONIALS = [
  {
    quote: "Aurum Ventura has helped bring more structure to the administrative side of our business. Having support with organization, documentation, and day-to-day back-office tasks allows us to stay focused on serving our customers and growing the company.",
    name: "Clayton Fleming",
    business: "At Your Service Janitorial",
    industry: "Cleaning & Landscaping",
  },
  {
    quote: "Running a restaurant means there are always a lot of moving pieces behind the scenes. Aurum Ventura helps keep the administrative side organized so we can spend more time focused on our operation, our staff, and our guests.",
    name: "Raven Robinson",
    business: "Catch Land & Sea",
    industry: "Restaurant",
  },
  {
    quote: "Aurum Ventura provides the kind of administrative support that makes managing properties more organized and efficient. Having someone help keep documents, records, and ongoing tasks in order gives me more time to focus on tenants, properties, and the bigger picture.",
    name: "Jenny Atkins",
    business: "Independent Property Manager",
    industry: "Property Management",
  },
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
export function adminIntakeDetailKey(id) { return `admin-intake:${id}`; }

export function pathFor(key) {
  if (typeof key === "string" && key.startsWith("admin-intake:")) return "/admin/intakes/" + key.slice("admin-intake:".length);
  switch (key) {
    case "Home": return "/";
    case "Services": return "/services";
    case "About": return "/about";
    case "Industries": return "/industries";
    case "HowItWorks": return "/how-it-works";
    case "Security": return "/security";
    case "Privacy": return "/privacy";
    case "Terms": return "/terms";
    case "Contact": return "/contact";
    case "Upload": return "/upload";
    case "ClientIntake": return "/client-intake";
    case "AdminLogin": return "/admin";
    case "AdminIntakes": return "/admin/intakes";
    default: return "/services/" + key;
  }
}

export function pageFromPath(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "Home";
  if (path === "/services") return "Services";
  if (path === "/about") return "About";
  if (path === "/industries") return "Industries";
  if (path === "/how-it-works") return "HowItWorks";
  if (path === "/security") return "Security";
  if (path === "/privacy") return "Privacy";
  if (path === "/terms") return "Terms";
  if (path === "/contact") return "Contact";
  if (path === "/upload") return "Upload";
  if (path === "/client-intake") return "ClientIntake";
  if (path === "/admin" || path === "/admin/login") return "AdminLogin";
  if (path === "/admin/intakes") return "AdminIntakes";
  const adminIntakeMatch = path.match(/^\/admin\/intakes\/([^/]+)$/);
  if (adminIntakeMatch) return adminIntakeDetailKey(adminIntakeMatch[1]);
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

const NAV_LABELS = { HowItWorks: "How It Works", Upload: "Upload Documents" };

function Nav({ page, setPage }) {
  const items = ["Home", "Services", "Industries", "HowItWorks", "About"];
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
              {NAV_LABELS[it] || it}
            </a>
          ))}
          <a
            className={"nav-cta" + (page === "Contact" ? " active" : "")}
            href={pathFor("Contact")}
            onClick={go("Contact")}
          >
            Contact
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
              {NAV_LABELS[it] || it}
            </a>
          ))}
          <a
            className={"nav-mobile-link nav-mobile-cta" + (page === "Contact" ? " active" : "")}
            href={pathFor("Contact")}
            onClick={go("Contact", true)}
          >
            Contact
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
            <a href={pathFor("Industries")} onClick={go("Industries")}>Industries</a>
          </div>
          <div>
            <h3>How We Work</h3>
            <a href={pathFor("HowItWorks")} onClick={go("HowItWorks")}>How It Works</a>
            <a href={pathFor("Security")} onClick={go("Security")}>Security &amp; Confidentiality</a>
          </div>
          <div>
            <h3>Get in Touch</h3>
            <a href={pathFor("Contact")} onClick={go("Contact")}>Request a Consultation</a>
            <p className="footer-contact">admin@aurumventura.net</p>
            <p className="footer-contact">850-653-7797</p>
          </div>
          <div>
            <h3>For Clients</h3>
            <a href={pathFor("ClientIntake")} onClick={go("ClientIntake")}>Client Intake</a>
            <a href={pathFor("Upload")} onClick={go("Upload")}>Upload Documents</a>
          </div>
        </div>
      </div>
      <Swoosh style={{ width: "140px", height: "46px", opacity: 0.5, margin: "0 auto" }} />
      <div className="footer-legal-bar">
        <p className="footer-legal">
          &copy; {new Date().getFullYear()} Aurum Ventura Enterprise LLC. Remote administrative support for businesses nationwide.
        </p>
        <p className="footer-legal-links">
          <a href={pathFor("About")} onClick={go("About")}>About</a>
          <span aria-hidden="true">&middot;</span>
          <a href={pathFor("Security")} onClick={go("Security")}>Security &amp; Confidentiality</a>
          <span aria-hidden="true">&middot;</span>
          <a href={pathFor("Privacy")} onClick={go("Privacy")}>Privacy Policy</a>
          <span aria-hidden="true">&middot;</span>
          <a href={pathFor("Terms")} onClick={go("Terms")}>Terms of Service</a>
        </p>
      </div>
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
  const costRef = useReveal();
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

      <section className="section alt">
        <h2 ref={costRef}>What It's Actually Costing You</h2>
        <p className="section-lead">
          Every hour spent on paperwork is an hour not spent running the business. Here's roughly
          where that time tends to go for a growing operation without dedicated admin staff:
        </p>
        <div className="cost-list">
          {TIME_COST.map(([task, hours]) => (
            <div className="cost-row" key={task}>
              <span>{task}</span>
              <span className="cost-hours">{hours}</span>
            </div>
          ))}
        </div>
        <p className="cost-total">
          That's often 10+ hours a week — the better part of a full workday, gone before you've
          touched the work only you can do.
        </p>
      </section>

      <section className="section">
        <h2 ref={handleRef}>What We Handle</h2>
        <div className="plain-grid">
          {SERVICES.map((s, i) => (
            <a className="plain-grid-item" key={s.slug} href={pathFor(s.slug)} onClick={go(s.slug)}>
              <span className="plain-num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.title}</h3>
              {s.oneTime && <span className="badge-one-time">One-Time</span>}
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

      <Testimonials />

      <TimeSelector setPage={setPage} />
    </div>
  );
}

function Testimonials() {
  const ref = useReveal();
  return (
    <section className="section alt">
      <h2 ref={ref}>What Clients Say</h2>
      <div className="testimonial-grid">
        {TESTIMONIALS.map((t) => (
          <blockquote className="testimonial-card" key={t.name}>
            <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
            <footer>
              <span className="testimonial-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7v1H4v-1z" /></svg>
              </span>
              <span className="testimonial-attribution">
                <span className="testimonial-name">{t.name}</span>
                <span className="testimonial-business">{t.business}</span>
                <span className="testimonial-industry">{t.industry}</span>
              </span>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

function ServiceRow({ slug, index, setPage }) {
  const service = SERVICES.find((s) => s.slug === slug);
  const ref = useReveal();
  const go = (e) => { e.preventDefault(); setPage(slug); };
  return (
    <a className="service-row" href={pathFor(slug)} onClick={go} ref={ref}>
      <h2>
        {String(index + 1).padStart(2, "0")} &middot; {service.title}
        {service.oneTime && <span className="badge-one-time">One-Time Project</span>}
      </h2>
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
          Our recurring services fall into core categories — your Scope of Services is built from
          the ones you actually need — plus a one-time Business File Reset project if you just need
          your existing files organized.
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
        <h1>{service.title}{service.oneTime && <span className="badge-one-time badge-one-time-h1">One-Time Project</span>}</h1>
        <p className="hero-sub">{service.summary}</p>
      </section>
      <section className="section">
        <h2>Examples of This Work</h2>
        <ul className="plain-list">
          {service.examples.map((ex) => <li key={ex}>{ex}</li>)}
        </ul>
      </section>
      <section className="cta-band">
        {service.oneTime ? (
          <>
            <h2>Want your files organized?</h2>
            <p>We'll quote it as a fixed, one-time project based on your current setup — no ongoing commitment required.</p>
          </>
        ) : (
          <>
            <h2>Want this handled for you?</h2>
            <p>We'll fold it into a Scope of Services built around what you actually need.</p>
          </>
        )}
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Request a Consultation</a>
      </section>
    </div>
  );
}

function AboutPage({ setPage }) {
  const staysRef = useReveal();
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
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
      <section className="section alt">
        <h2 ref={staysRef}>What Stays With You</h2>
        <p className="section-lead">
          You retain ownership and control of your accounts, systems, and business decisions at
          all times. We execute administrative work based on what you tell us — the underlying
          decisions, and your legal and regulatory obligations, stay with you.
        </p>
        <a className="btn-text" href={pathFor("HowItWorks")} onClick={go("HowItWorks")}>See our full process and how pricing works &rarr;</a>
      </section>
      <section className="cta-band">
        <h2>Ready to talk?</h2>
        <p>A short consultation to see if this is a fit — no pressure, no commitment.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={(e) => { e.preventDefault(); setPage("Contact"); }}>Request a Consultation</a>
      </section>
    </div>
  );
}

function HowItWorksPage({ setPage }) {
  const processRef = useReveal();
  const pricingRef = useReveal();
  return (
    <div>
      <section className="page-head">
        <p className="kicker">How It Works</p>
        <h1>How It Works</h1>
        <p className="hero-sub">
          From first conversation to active service, here's exactly what happens — and how your
          monthly investment is put together before you ever commit to anything.
        </p>
      </section>
      <section className="section">
        <h2 ref={processRef}>Our Process</h2>
        <ProcessSteps />
      </section>
      <section className="section alt">
        <h2 ref={pricingRef}>How Pricing Works</h2>
        <p className="section-lead">
          No two businesses have the same administrative workload, so we don't sell fixed
          packages. After an initial consultation, we assess the responsibilities you need
          support with — the volume of work, the systems you use, and the level of ongoing
          support required — then define a clear scope and a fixed monthly quote for your
          approval before any work begins.
        </p>
        <div className="callout">
          <strong>No surprise hourly billing.</strong> Your agreed scope and monthly service fee
          are set before work begins. Anything outside that agreed scope is quoted separately, not
          billed to you automatically.
        </div>
      </section>
      <section className="cta-band">
        <h2>Ready to see what it would cost?</h2>
        <p>A short consultation gets you a defined scope and a fixed monthly quote.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={(e) => { e.preventDefault(); setPage("Contact"); }}>Request a Consultation</a>
      </section>
    </div>
  );
}

function IndustriesPage({ setPage }) {
  const ref = useReveal();
  return (
    <div>
      <section className="page-head">
        <p className="kicker">Industries</p>
        <h1>Who We Work With</h1>
        <p className="hero-sub">
          Businesses with real administrative volume but no dedicated staff to own it — growing
          operations that need consistency, not a full-time hire.
        </p>
      </section>
      <section className="section">
        <h2 ref={ref}>Industries We Serve</h2>
        <IndustryPanel />
      </section>
      <section className="cta-band">
        <h2>Don't see your industry?</h2>
        <p>We work with a range of service and operational businesses beyond this list — tell us what you do.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={(e) => { e.preventDefault(); setPage("Contact"); }}>Request a Consultation</a>
      </section>
    </div>
  );
}

function SecurityPage({ setPage }) {
  const handlingRef = useReveal();
  const retentionRef = useReveal();
  const controlRef = useReveal();
  return (
    <div>
      <section className="page-head">
        <p className="kicker">Security &amp; Confidentiality</p>
        <h1>How We Protect Your Information</h1>
        <p className="hero-sub">
          Client documents and business information pass through Aurum Ventura in the course of
          normal administrative work. Here's exactly how that information is handled, who can see
          it, and what happens to it when an engagement ends.
        </p>
      </section>

      <section className="section">
        <h2>Confidentiality, By Default</h2>
        <p className="section-lead">
          Every team member who works with client documents or data signs a confidentiality
          agreement before doing so. Access to a client's files and information is limited to the
          staff actually working that account — not shared broadly across the team.
        </p>
      </section>

      <section className="section alt">
        <h2 ref={handlingRef}>How Your Documents Are Handled</h2>
        <ul className="plain-list industry-examples">
          <li>Documents are stored in Dropbox, a business-grade storage provider that encrypts data both in transit and at rest.</li>
          <li>All communication with our systems — document uploads, client intake, administrative requests — is encrypted in transit (HTTPS/TLS).</li>
          <li>Internal administrative access to reviewed intake and request data requires a login, and is protected against repeated automated login attempts.</li>
          <li>Actions taken on your account inside our internal systems are logged, so there's a record of what happened and when.</li>
        </ul>
      </section>

      <section className="section">
        <h2 ref={retentionRef}>Data Retention &amp; Offboarding</h2>
        <p className="section-lead">
          Your documents and information are retained for the duration of your active engagement.
          If you end services with Aurum Ventura, your documents are deleted or returned to you
          (your choice) within 90 days of offboarding — just let us know at offboarding which you'd
          prefer.
        </p>
      </section>

      <section className="section alt">
        <h2 ref={controlRef}>What Stays With You</h2>
        <p className="section-lead">
          You retain ownership and control of your accounts, systems, and business decisions at all
          times. We act on your instructions and within the scope you've defined — we don't use
          your information for any purpose outside the administrative work you've asked us to do.
        </p>
      </section>

      <section className="cta-band">
        <h2>Questions about how we handle your information?</h2>
        <p>We're glad to walk through this in more detail before you send us anything.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={(e) => { e.preventDefault(); setPage("Contact"); }}>Request a Consultation</a>
      </section>
    </div>
  );
}

function LegalPage({ kicker, title, updated, children }) {
  return (
    <div>
      <section className="page-head">
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="hero-sub legal-updated">Last updated {updated}</p>
      </section>
      <section className="section legal-body">{children}</section>
    </div>
  );
}

function PrivacyPage({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  return (
    <LegalPage kicker="Privacy Policy" title="Privacy Policy" updated="September 2026">
      <h2>What We Collect</h2>
      <p>
        We collect the information you choose to give us: your name, business name, email, and
        phone number when you request a consultation; company and contact details when you
        complete client intake; and the files and descriptions you provide when you submit
        documents or administrative requests. We don't collect information about you from any
        other source.
      </p>
      <h2>How We Use It</h2>
      <p>
        We use this information to respond to your inquiry, set up and deliver the administrative
        services you've engaged us for, and communicate with you about your account. We don't use
        it for advertising, and we don't sell or rent it to anyone.
      </p>
      <h2>Who We Share It With</h2>
      <p>
        We share information only with the service providers that make our operations possible —
        Dropbox for document storage, a database provider for records related to your account, and
        an email delivery provider for transactional messages (like confirming a submission). These
        providers process information on our behalf; they don't use it for their own purposes. See
        our <a href={pathFor("Security")} onClick={go("Security")}>Security &amp; Confidentiality</a> page
        for more on how documents are handled and retained.
      </p>
      <h2>Cookies &amp; Tracking</h2>
      <p>
        This site does not use third-party analytics, advertising, or tracking cookies. The only
        cookie in this system is a private, employee-only session cookie used to secure our
        internal administrative login — it is never set for site visitors or clients using the
        public-facing forms.
      </p>
      <h2>Your Choices</h2>
      <p>
        You can ask us what information we have about you, or ask us to correct or delete it, by
        emailing <a href="mailto:admin@aurumventura.net">admin@aurumventura.net</a>. If you're an
        active client, document retention after your engagement ends is handled per our{" "}
        <a href={pathFor("Security")} onClick={go("Security")}>Security &amp; Confidentiality</a> policy.
      </p>
      <h2>Changes to This Policy</h2>
      <p>
        If this policy changes, we'll update the date at the top of this page. Continued use of
        this site or our services after a change means you accept the updated policy.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about this policy? Email <a href="mailto:admin@aurumventura.net">admin@aurumventura.net</a> or
        call <a href="tel:+18506537797">850-653-7797</a>.
      </p>
    </LegalPage>
  );
}

function TermsPage({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  return (
    <LegalPage kicker="Terms of Service" title="Terms of Service" updated="September 2026">
      <h2>Using This Site</h2>
      <p>
        This website provides information about Aurum Ventura Enterprise LLC's administrative
        services and lets you request a consultation, complete client intake, or submit documents.
        You agree to provide accurate information through these forms and not to use the site for
        any unlawful purpose.
      </p>
      <h2>Our Services Are Governed Separately</h2>
      <p>
        Browsing this site or submitting a form doesn't create a services agreement. Paid
        administrative services begin only once a Master Agreement and a Scope &amp; Service Level
        Exhibit have been reviewed and signed by both parties, as described on our{" "}
        <a href={pathFor("About")} onClick={go("About")}>About</a> page. Those signed
        documents — not this page — govern the actual scope, pricing, and terms of service delivery.
      </p>
      <h2>What Stays With You</h2>
      <p>
        As a client, you retain ownership and control of your accounts, systems, and business
        decisions at all times. We carry out administrative work based on your instructions and
        within your defined scope; the underlying decisions, and your legal and regulatory
        obligations, remain yours.
      </p>
      <h2>Not Professional Advice</h2>
      <p>
        Aurum Ventura provides administrative and back-office support. Nothing we do or say
        constitutes legal, tax, financial, or other professional advice, and you should consult a
        licensed professional for those matters.
      </p>
      <h2>Intellectual Property</h2>
      <p>
        The content of this site — text, design, and graphics — belongs to Aurum Ventura Enterprise
        LLC unless otherwise noted, and may not be copied or reused without permission.
      </p>
      <h2>Limitation of Liability</h2>
      <p>
        This site and its content are provided as-is. To the fullest extent permitted by law, Aurum
        Ventura Enterprise LLC is not liable for indirect, incidental, or consequential damages
        arising from your use of this site. This section does not limit liability arising from a
        signed services agreement, which is governed by its own terms.
      </p>
      <h2>Changes to These Terms</h2>
      <p>
        If these terms change, we'll update the date at the top of this page. Continued use of this
        site after a change means you accept the updated terms.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about these terms? Email <a href="mailto:admin@aurumventura.net">admin@aurumventura.net</a> or
        call <a href="tel:+18506537797">850-653-7797</a>.
      </p>
    </LegalPage>
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
            <p>admin@aurumventura.net</p>
            <p>850-653-7797</p>
            <h2>Typical Response</h2>
            <p>Within one business day.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function readDirectoryEntry(entry) {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file) => resolve([file]), () => resolve([]));
      return;
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      const collected = [];
      const readBatch = () => {
        reader.readEntries(async (entries) => {
          if (!entries.length) { resolve(collected); return; }
          for (const e of entries) collected.push(...(await readDirectoryEntry(e)));
          readBatch(); // readEntries only returns a batch at a time — must keep calling until empty
        }, () => resolve(collected));
      };
      readBatch();
      return;
    }
    resolve([]);
  });
}

function UploadPage() {
  const [form, setForm] = useState({
    uploadCode: "", email: "", category: "", documentDescription: "", requestedAction: "", additionalNotes: "",
  });
  const [files, setFiles] = useState([]);
  const [submitState, setSubmitState] = useState("idle"); // idle | submitting | success
  const [formError, setFormError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID()).current;
  const browseRef = useRef(null);
  const folderRef = useRef(null);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validFileCount = files.filter((f) => f.status !== "error").length;
  const isReady =
    form.uploadCode.trim().length > 0 &&
    isValidEmail(form.email) &&
    UPLOAD_CATEGORIES.includes(form.category) &&
    isMeaningfulText(form.documentDescription, MIN_DESCRIPTION_LENGTH) &&
    isMeaningfulText(form.requestedAction, MIN_REQUESTED_ACTION_LENGTH) &&
    validFileCount > 0 &&
    submitState !== "submitting";

  function addFiles(fileList) {
    const incoming = Array.from(fileList).map((file) => {
      const allowed = isAllowedExtension(file.name);
      const tooLarge = file.size > MAX_FILE_SIZE_BYTES;
      return {
        localId: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        status: !allowed || tooLarge ? "error" : "pending",
        error: !allowed
          ? `".${fileExtension(file.name) || "?"}" isn't a supported file type.`
          : tooLarge
          ? `Larger than the ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB limit.`
          : "",
        progress: 0,
      };
    });
    setFiles((prev) => {
      const room = Math.max(0, MAX_FILES_PER_UPLOAD - prev.length);
      return [...prev, ...incoming.slice(0, room)];
    });
  }

  const removeFile = (localId) => setFiles((prev) => prev.filter((f) => f.localId !== localId));

  const onDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);
    const items = e.dataTransfer.items;
    if (items && items.length && items[0].webkitGetAsEntry) {
      const collected = [];
      for (const item of items) {
        const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
        if (entry) collected.push(...(await readDirectoryEntry(entry)));
      }
      addFiles(collected);
    } else {
      addFiles(e.dataTransfer.files);
    }
  };

  function uploadOneFile(uploadId, f) {
    return new Promise((resolve) => {
      setFiles((prev) => prev.map((x) => (x.localId === f.localId ? { ...x, status: "uploading", progress: 0 } : x)));
      const xhr = new XMLHttpRequest();
      const body = new FormData();
      body.append("uploadId", uploadId);
      body.append("file", f.file, f.file.name);
      xhr.open("POST", "/api/upload/file");
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        setFiles((prev) => prev.map((x) => (x.localId === f.localId ? { ...x, progress: pct } : x)));
      };
      xhr.onload = () => {
        const ok = xhr.status >= 200 && xhr.status < 300;
        let message = "";
        try { message = JSON.parse(xhr.responseText).message || ""; } catch { /* non-JSON error body */ }
        setFiles((prev) => prev.map((x) => (x.localId === f.localId
          ? { ...x, status: ok ? "done" : "error", progress: ok ? 100 : x.progress, error: ok ? "" : (message || "Upload failed.") }
          : x)));
        resolve(ok);
      };
      xhr.onerror = () => {
        setFiles((prev) => prev.map((x) => (x.localId === f.localId ? { ...x, status: "error", error: "Network error." } : x)));
        resolve(false);
      };
      xhr.send(body);
    });
  }

  async function submit(e) {
    e.preventDefault();
    if (!isReady) return;
    setSubmitState("submitting");
    setFormError("");
    try {
      const initRes = await fetch("/api/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, idempotencyKey }),
      });
      const initData = await initRes.json().catch(() => ({}));
      if (!initRes.ok) {
        setFormError(initData.message || "Something went wrong. Please try again.");
        setSubmitState("idle");
        return;
      }
      const { uploadId } = initData;

      const pending = files.filter((f) => f.status !== "error");
      const results = [];
      for (const f of pending) results.push(await uploadOneFile(uploadId, f));

      if (!results.some(Boolean)) {
        setFormError("None of the files could be uploaded. Please check them and try again.");
        setSubmitState("idle");
        return;
      }

      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId }),
      });
      const completeData = await completeRes.json().catch(() => ({}));
      if (!completeRes.ok) {
        setFormError(completeData.message || "Your files were received, but we couldn't finish submitting. Your files are safe — please try again.");
        setSubmitState("idle");
        return;
      }

      setConfirmation(completeData);
      setSubmitState("success");
    } catch {
      setFormError("A network error occurred. Please check your connection and try again.");
      setSubmitState("idle");
    }
  }

  if (submitState === "success" && confirmation) {
    return (
      <div>
        <section className="page-head">
          <p className="kicker">Upload Documents</p>
          <h1>Upload Received</h1>
          <p className="hero-sub">Your documents have been securely received by Aurum Ventura.</p>
        </section>
        <section className="section">
          <div className="upload-confirm-panel">
            <div className="upload-confirm-row"><span>Reference</span><strong>{confirmation.referenceNumber}</strong></div>
            <div className="upload-confirm-row"><span>Files received</span><strong>{confirmation.fileCount}</strong></div>
            <div className="upload-confirm-row"><span>Category</span><strong>{confirmation.category}</strong></div>
            <div className="upload-confirm-row"><span>Requested action</span><strong>{confirmation.requestedAction}</strong></div>
          </div>
          <p className="hero-sub" style={{ marginTop: "1.4rem" }}>We will contact you if additional information is required.</p>
        </section>
      </div>
    );
  }

  return (
    <div>
      <section className="page-head">
        <p className="kicker">Upload Documents</p>
        <h1>Upload Documents</h1>
        <p className="hero-sub">Securely send documents and administrative requests to Aurum Ventura.</p>
      </section>
      <section className="section">
        <div className="upload-layout">
          <div className="upload-explain">
            <h2>How this works</h2>
            <p>
              Enter your upload code and email, tell us what you're sending and what you need done with it,
              then attach the files or folder. We'll confirm by email once it's received.
            </p>
            <div className="upload-notice">
              Do not upload account passwords, authentication codes, security questions, encryption keys, or
              payment-card information through this form.
            </div>
          </div>

          <form className="contact-form upload-form" onSubmit={submit} noValidate>
            {formError && <div className="upload-error" role="alert" aria-live="assertive">{formError}</div>}

            <label>
              Upload Code
              <input type="password" required autoComplete="off" value={form.uploadCode} onChange={update("uploadCode")} />
            </label>
            <label>
              Email Address
              <input type="email" required value={form.email} onChange={update("email")} />
            </label>
            <label>
              Document Category
              <select required value={form.category} onChange={update("category")}>
                <option value="">Select one</option>
                {UPLOAD_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>
              What is this document?
              <span className="field-help">Briefly describe what you are uploading so our team knows what the files relate to.</span>
              <textarea
                rows={3}
                required
                placeholder="Updated certificate of insurance for Green Valley Landscaping."
                value={form.documentDescription}
                onChange={update("documentDescription")}
              />
            </label>
            <label>
              What do you need us to do with it?
              <span className="field-help">Tell us the administrative action you need completed.</span>
              <textarea
                rows={3}
                required
                placeholder="Replace the previous COI in the vendor record and update the expiration date."
                value={form.requestedAction}
                onChange={update("requestedAction")}
              />
            </label>
            <label>
              Additional Notes <span className="field-optional">(optional)</span>
              <textarea rows={2} value={form.additionalNotes} onChange={update("additionalNotes")} />
            </label>

            <div>
              <span className="upload-dropzone-label">Files</span>
              <div
                className={"upload-dropzone" + (dragActive ? " active" : "")}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                onClick={() => browseRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); browseRef.current?.click(); } }}
                aria-label="Drag and drop files here, or activate to browse"
              >
                <p>Drag files or a folder here, or</p>
                <div className="upload-dropzone-actions">
                  <button type="button" className="btn-secondary" onClick={(e) => { e.stopPropagation(); browseRef.current?.click(); }}>
                    Browse Files
                  </button>
                  <button type="button" className="btn-secondary" onClick={(e) => { e.stopPropagation(); folderRef.current?.click(); }}>
                    Browse Folder
                  </button>
                </div>
                <p className="upload-dropzone-hint">
                  Allowed: {ALLOWED_EXTENSIONS.join(", ").toUpperCase()} — up to {Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB per file
                </p>
                <input
                  ref={browseRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                />
                <input
                  ref={folderRef}
                  type="file"
                  multiple
                  webkitdirectory=""
                  directory=""
                  hidden
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                />
              </div>

              {files.length > 0 && (
                <ul className="upload-file-list" aria-live="polite">
                  {files.map((f) => (
                    <li key={f.localId} className={"upload-file-row" + (f.status === "error" ? " error" : "")}>
                      <div className="upload-file-info">
                        <span className="upload-file-name">{f.file.name}</span>
                        <span className="upload-file-size">{(f.file.size / 1024).toFixed(0)} KB</span>
                      </div>
                      {f.status === "uploading" && (
                        <div className="upload-progress-track"><div className="upload-progress-fill" style={{ width: f.progress + "%" }} /></div>
                      )}
                      {f.status === "done" && <span className="upload-file-status done">Uploaded</span>}
                      {f.status === "error" && <span className="upload-file-status error">{f.error}</span>}
                      {f.status !== "uploading" && submitState !== "submitting" && (
                        <button type="button" className="upload-file-remove" aria-label={`Remove ${f.file.name}`} onClick={() => removeFile(f.localId)}>
                          &times;
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button className="btn-primary" type="submit" disabled={!isReady} aria-live="polite">
              {submitState === "submitting" ? "Submitting…" : "Submit Documents"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function ClientIntakePage() {
  const [form, setForm] = useState({
    intakeCode: "",
    legalName: "", dbaName: "", industry: "", website: "",
    addressStreet: "", addressCity: "", addressState: "", addressZip: "",
    numLocations: "", numEmployees: "", yearEstablished: "",
    primaryContactName: "", primaryContactTitle: "", primaryContactEmail: "", primaryContactPhone: "",
    preferredContactMethod: "", businessHours: "", timezone: "", mainAdminContact: "",
    businessNotes: "", recurringNotes: "", additionalNotes: "",
  });
  const [contacts, setContacts] = useState([]);
  const [systems, setSystems] = useState([]);
  const [customSystems, setCustomSystems] = useState("");
  const [areas, setAreas] = useState([]);
  const [submitState, setSubmitState] = useState("idle");
  const [formError, setFormError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const idempotencyKey = useRef(crypto.randomUUID()).current;

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (list, setList, value) => () =>
    setList((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const errors = intakeValidationErrors(form);
  const isReady = form.intakeCode.trim().length > 0 && Object.keys(errors).length === 0 && submitState !== "submitting";

  function addContact() {
    setContacts((prev) => [...prev, { localId: crypto.randomUUID(), fullName: "", title: "", email: "", phone: "", notes: "" }]);
  }
  function updateContact(localId, field, value) {
    setContacts((prev) => prev.map((c) => (c.localId === localId ? { ...c, [field]: value } : c)));
  }
  function removeContact(localId) {
    setContacts((prev) => prev.filter((c) => c.localId !== localId));
  }

  async function submit(e) {
    e.preventDefault();
    if (!isReady) return;
    setSubmitState("submitting");
    setFormError("");
    const allSystems = [...systems, ...customSystems.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)];
    try {
      const res = await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          authorizedContacts: contacts.map(({ localId, ...c }) => c),
          systems: allSystems,
          administrativeAreas: areas,
          idempotencyKey,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.message || "Something went wrong. Please try again.");
        setSubmitState("idle");
        return;
      }
      setConfirmation(data);
      setSubmitState("success");
    } catch {
      setFormError("A network error occurred. Please check your connection and try again.");
      setSubmitState("idle");
    }
  }

  if (submitState === "success" && confirmation) {
    return (
      <div>
        <section className="page-head">
          <p className="kicker">Client Intake</p>
          <h1>Intake Request Received</h1>
          <p className="hero-sub">Thank you. Your company information has been submitted to Aurum Ventura for review.</p>
        </section>
        <section className="section">
          <div className="upload-confirm-panel">
            <div className="upload-confirm-row"><span>Reference</span><strong>{confirmation.referenceNumber}</strong></div>
          </div>
          <p className="hero-sub" style={{ marginTop: "1.4rem" }}>
            Your client profile has not yet been activated. Aurum Ventura will review your information and
            contact you if anything further is required.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div>
      <section className="page-head">
        <p className="kicker">Client Intake</p>
        <h1>Client Intake</h1>
        <p className="hero-sub">Complete your company information so Aurum Ventura can begin setting up your administrative services.</p>
        <div className="upload-notice" style={{ maxWidth: "640px" }}>
          Submitting this form does not automatically activate your account. Your information will be reviewed
          by Aurum Ventura before your client profile is created.
        </div>
      </section>
      <section className="section">
        <form className="contact-form intake-form" onSubmit={submit} noValidate>
          {formError && <div className="upload-error" role="alert" aria-live="assertive">{formError}</div>}

          <label>
            Client Intake Code
            <input type="password" required autoComplete="off" value={form.intakeCode} onChange={update("intakeCode")} />
          </label>

          <h2 className="intake-section-title">Company Information</h2>
          <label>
            Legal Business Name
            <input required value={form.legalName} onChange={update("legalName")} />
          </label>
          <label>
            DBA / Trade Name <span className="field-optional">(optional)</span>
            <input value={form.dbaName} onChange={update("dbaName")} />
          </label>
          <label>
            Industry / Business Type
            <input required value={form.industry} onChange={update("industry")} />
          </label>
          <label>
            Website <span className="field-optional">(optional)</span>
            <input type="url" value={form.website} onChange={update("website")} placeholder="https://" />
          </label>
          <label>
            Business Street Address
            <input required value={form.addressStreet} onChange={update("addressStreet")} />
          </label>
          <div className="form-row">
            <label>
              City
              <input required value={form.addressCity} onChange={update("addressCity")} />
            </label>
            <label>
              State
              <input required value={form.addressState} onChange={update("addressState")} />
            </label>
          </div>
          <div className="form-row">
            <label>
              ZIP Code
              <input required value={form.addressZip} onChange={update("addressZip")} />
            </label>
            <label>
              Number of Business Locations
              <input type="number" min="1" required value={form.numLocations} onChange={update("numLocations")} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Approximate Number of Employees <span className="field-optional">(optional)</span>
              <input value={form.numEmployees} onChange={update("numEmployees")} />
            </label>
            <label>
              Year Business Was Established <span className="field-optional">(optional)</span>
              <input value={form.yearEstablished} onChange={update("yearEstablished")} />
            </label>
          </div>

          <h2 className="intake-section-title">Primary Contact</h2>
          <div className="form-row">
            <label>
              Full Name
              <input required value={form.primaryContactName} onChange={update("primaryContactName")} />
            </label>
            <label>
              Title / Position
              <input required value={form.primaryContactTitle} onChange={update("primaryContactTitle")} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Business Email Address
              <input type="email" required value={form.primaryContactEmail} onChange={update("primaryContactEmail")} />
            </label>
            <label>
              Phone Number
              <input type="tel" required value={form.primaryContactPhone} onChange={update("primaryContactPhone")} />
            </label>
          </div>

          <h2 className="intake-section-title">Business Operations</h2>
          <label>
            Preferred Communication Method
            <select value={form.preferredContactMethod} onChange={update("preferredContactMethod")}>
              <option value="">Select one</option>
              {CONTACT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <div className="form-row">
            <label>
              Normal Business Hours
              <input value={form.businessHours} onChange={update("businessHours")} placeholder="e.g. Mon–Fri, 8am–5pm" />
            </label>
            <label>
              Time Zone
              <input value={form.timezone} onChange={update("timezone")} placeholder="e.g. Central" />
            </label>
          </div>
          <label>
            Main Administrative Contact <span className="field-optional">(if different from primary contact)</span>
            <input value={form.mainAdminContact} onChange={update("mainAdminContact")} />
          </label>

          <h2 className="intake-section-title">Authorized Contacts</h2>
          <p className="field-help" style={{ marginBottom: "0.6rem" }}>
            e.g. "Authorized to submit routine administrative requests," "Authorized to approve invoice
            preparation," "Primary decision maker."
          </p>
          {contacts.map((c) => (
            <div className="intake-contact-row" key={c.localId}>
              <div className="form-row">
                <label>Full Name<input value={c.fullName} onChange={(e) => updateContact(c.localId, "fullName", e.target.value)} /></label>
                <label>Title / Role<input value={c.title} onChange={(e) => updateContact(c.localId, "title", e.target.value)} /></label>
              </div>
              <div className="form-row">
                <label>Email Address<input type="email" value={c.email} onChange={(e) => updateContact(c.localId, "email", e.target.value)} /></label>
                <label>Phone Number<input type="tel" value={c.phone} onChange={(e) => updateContact(c.localId, "phone", e.target.value)} /></label>
              </div>
              <label>Authorization Level / Notes<input value={c.notes} onChange={(e) => updateContact(c.localId, "notes", e.target.value)} /></label>
              <button type="button" className="intake-remove-contact" onClick={() => removeContact(c.localId)}>Remove Contact</button>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addContact}>+ Add Authorized Contact</button>

          <h2 className="intake-section-title">Systems &amp; Software</h2>
          <p className="field-help" style={{ marginBottom: "0.6rem" }}>Which systems does your business currently use?</p>
          <div className="intake-checkbox-grid">
            {SYSTEM_OPTIONS.map((s) => (
              <label key={s} className="intake-checkbox">
                <input type="checkbox" checked={systems.includes(s)} onChange={toggle(systems, setSystems, s)} />
                {s}
              </label>
            ))}
          </div>
          <label>
            Other system name(s) <span className="field-optional">(optional, comma-separated)</span>
            <input value={customSystems} onChange={(e) => setCustomSystems(e.target.value)} />
          </label>
          <div className="upload-notice">
            Do not enter passwords, authentication codes, security questions or other login credentials in this
            form. Actual system access will be handled separately.
          </div>

          <h2 className="intake-section-title">Administrative Services</h2>
          <p className="field-help" style={{ marginBottom: "0.6rem" }}>
            Which administrative areas will Aurum Ventura be assisting your business with?
          </p>
          <div className="intake-checkbox-grid">
            {ADMIN_AREA_OPTIONS.map((a) => (
              <label key={a} className="intake-checkbox">
                <input type="checkbox" checked={areas.includes(a)} onChange={toggle(areas, setAreas, a)} />
                {a}
              </label>
            ))}
          </div>

          <h2 className="intake-section-title">Business Information / Notes</h2>
          <label>
            What should Aurum Ventura know about your business?
            <span className="field-help">
              Describe your business operations, administrative setup, current processes or anything that will
              help us understand how your company operates. Are there any administrative processes, deadlines
              or recurring responsibilities we should know about?
            </span>
            <textarea rows={4} required value={form.businessNotes} onChange={update("businessNotes")} />
          </label>
          <label>
            Additional Notes <span className="field-optional">(optional)</span>
            <textarea rows={2} value={form.additionalNotes} onChange={update("additionalNotes")} />
          </label>

          <button className="btn-primary" type="submit" disabled={!isReady}>
            {submitState === "submitting" ? "Submitting Intake…" : "Submit Client Intake"}
          </button>
        </form>
      </section>
    </div>
  );
}

// Thin fetch wrapper for /api/admin/* — always sends the session cookie,
// and centralizes the "session expired mid-use" redirect so every admin
// page doesn't have to handle that case separately.
async function adminFetch(url, options, onUnauthorized) {
  const res = await fetch(url, { ...options, credentials: "same-origin" });
  if (res.status === 401) {
    onUnauthorized?.();
    throw Object.assign(new Error("unauthorized"), { code: "UNAUTHORIZED" });
  }
  return res;
}

function AdminLoginPage({ setPage }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => { if (d.authenticated) setPage("AdminIntakes"); })
      .catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setPage("AdminIntakes");
    } catch {
      setError("A network error occurred. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <section className="page-head">
        <p className="kicker">Admin</p>
        <h1>Admin Login</h1>
      </section>
      <section className="section">
        <form className="contact-form" style={{ maxWidth: "360px" }} onSubmit={submit} noValidate>
          {error && <div className="upload-error" role="alert" aria-live="assertive">{error}</div>}
          <label>
            Password
            <input type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="btn-primary" type="submit" disabled={!password || submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </section>
    </div>
  );
}

function AdminIntakesPage({ setPage }) {
  const [loading, setLoading] = useState(true);
  const [intakes, setIntakes] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/intakes", {}, () => setPage("AdminLogin"))
      .then((r) => r.json())
      .then((d) => {
        if (d.intakes) { setIntakes(d.intakes); setPendingCount(d.pendingCount || 0); }
        else setError(d.message || "Could not load intakes.");
        setLoading(false);
      })
      .catch((err) => { if (err.code !== "UNAUTHORIZED") { setError("Could not load intakes."); setLoading(false); } });
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    setPage("AdminLogin");
  }

  return (
    <div>
      <section className="page-head">
        <p className="kicker">Admin</p>
        <div className="admin-title-row">
          <h1>Client Intakes</h1>
          <button className="btn-secondary" onClick={logout}>Log Out</button>
        </div>
        <p className="hero-sub">{pendingCount} Pending</p>
      </section>
      <section className="section">
        {error && <div className="upload-error" role="alert">{error}</div>}
        {loading ? (
          <p>Loading…</p>
        ) : intakes.length === 0 ? (
          <p>No intake requests yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reference</th><th>Company</th><th>Primary Contact</th><th>Email</th><th>Submitted</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {intakes.map((i) => (
                  <tr key={i.id}>
                    <td>{i.referenceNumber}</td>
                    <td>{i.company}</td>
                    <td>{i.primaryContactName}</td>
                    <td>{i.primaryContactEmail}</td>
                    <td>{new Date(i.receivedAt).toLocaleDateString()}</td>
                    <td><span className={"admin-status admin-status-" + i.status.replace(/\s+/g, "-").toLowerCase()}>{i.status}</span></td>
                    <td>
                      <a
                        href={pathFor(adminIntakeDetailKey(i.id))}
                        onClick={(e) => { e.preventDefault(); setPage(adminIntakeDetailKey(i.id)); }}
                      >
                        Review
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function AdminIntakeDetailPage({ intakeId, setPage }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  function load() {
    setLoading(true);
    adminFetch(`/api/admin/intakes/${intakeId}`, {}, () => setPage("AdminLogin"))
      .then((r) => r.json())
      .then((d) => {
        if (d.intake) setData(d);
        else setError(d.message || "Could not load this intake.");
        setLoading(false);
      })
      .catch((err) => { if (err.code !== "UNAUTHORIZED") { setError("Could not load this intake."); setLoading(false); } });
  }
  useEffect(load, [intakeId]);

  async function approve(force) {
    setBusy(true);
    setActionError("");
    try {
      const res = await adminFetch(`/api/admin/intakes/${intakeId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: !!force }),
      }, () => setPage("AdminLogin"));
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (d.error === "potential_duplicate") {
          setActionError(`Potential existing client detected: ${d.duplicate.legalName} (${d.duplicate.clientNumber || d.duplicate.status}). Approve again to proceed anyway, or review manually.`);
          setConfirmingApprove(false);
          setBusy(false);
          return;
        }
        setActionError(d.message || "Approval could not be completed.");
        setBusy(false);
        return;
      }
      setResult({ clientNumber: d.clientNumber });
      setConfirmingApprove(false);
      load();
    } catch {
      setBusy(false);
    }
    setBusy(false);
  }

  async function requestInfo() {
    setBusy(true);
    setActionError("");
    try {
      const res = await adminFetch(`/api/admin/intakes/${intakeId}/request-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: infoMessage }),
      }, () => setPage("AdminLogin"));
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setActionError(d.message || "Could not send request."); setBusy(false); return; }
      setShowInfoForm(false);
      setInfoMessage("");
      load();
    } catch { /* handled by unauthorized redirect */ }
    setBusy(false);
  }

  async function reject() {
    setBusy(true);
    setActionError("");
    try {
      const res = await adminFetch(`/api/admin/intakes/${intakeId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      }, () => setPage("AdminLogin"));
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setActionError(d.message || "Could not reject this intake."); setBusy(false); return; }
      setShowRejectForm(false);
      load();
    } catch { /* handled by unauthorized redirect */ }
    setBusy(false);
  }

  if (loading) return <section className="section"><p>Loading…</p></section>;
  if (error || !data) return <section className="section"><div className="upload-error">{error || "Not found."}</div></section>;

  const { intake, authorizedContacts, potentialDuplicate } = data;
  const canAct = intake.status === "PENDING REVIEW" || intake.status === "MORE INFORMATION REQUIRED";

  return (
    <div>
      <section className="page-head">
        <a className="btn-text back-link" href={pathFor("AdminIntakes")} onClick={(e) => { e.preventDefault(); setPage("AdminIntakes"); }}>&larr; All Intakes</a>
        <p className="kicker">{intake.referenceNumber}</p>
        <h1>{intake.legalName}</h1>
        <p className="hero-sub"><span className={"admin-status admin-status-" + intake.status.replace(/\s+/g, "-").toLowerCase()}>{intake.status}</span></p>
      </section>
      <section className="section">
        {result && (
          <div className="admin-result-banner">Client created: {result.clientNumber}. An approval email has been sent.</div>
        )}
        {potentialDuplicate && !result && (
          <div className="admin-warning-banner">
            Potential existing client detected: {potentialDuplicate.legalName} ({potentialDuplicate.clientNumber || potentialDuplicate.status}).
          </div>
        )}
        {actionError && <div className="upload-error" role="alert">{actionError}</div>}

        <div className="admin-review-grid">
          <div className="panel-block">
            <h2>Company Information</h2>
            <dl className="admin-dl">
              <div><dt>Legal Name</dt><dd>{intake.legalName}</dd></div>
              {intake.dbaName && <div><dt>DBA</dt><dd>{intake.dbaName}</dd></div>}
              <div><dt>Industry</dt><dd>{intake.industry}</dd></div>
              {intake.website && <div><dt>Website</dt><dd>{intake.website}</dd></div>}
              <div><dt>Address</dt><dd>{intake.addressStreet}, {intake.addressCity}, {intake.addressState} {intake.addressZip}</dd></div>
              <div><dt>Locations</dt><dd>{intake.numLocations}</dd></div>
              {intake.numEmployees && <div><dt>Employees</dt><dd>{intake.numEmployees}</dd></div>}
              {intake.yearEstablished && <div><dt>Established</dt><dd>{intake.yearEstablished}</dd></div>}
            </dl>
          </div>

          <div className="panel-block">
            <h2>Primary Contact</h2>
            <dl className="admin-dl">
              <div><dt>Name</dt><dd>{intake.primaryContactName}</dd></div>
              <div><dt>Title</dt><dd>{intake.primaryContactTitle}</dd></div>
              <div><dt>Email</dt><dd>{intake.primaryContactEmail}</dd></div>
              <div><dt>Phone</dt><dd>{intake.primaryContactPhone}</dd></div>
              {intake.preferredContactMethod && <div><dt>Prefers</dt><dd>{intake.preferredContactMethod}</dd></div>}
              {intake.businessHours && <div><dt>Hours</dt><dd>{intake.businessHours}</dd></div>}
              {intake.timezone && <div><dt>Time Zone</dt><dd>{intake.timezone}</dd></div>}
              {intake.mainAdminContact && <div><dt>Admin Contact</dt><dd>{intake.mainAdminContact}</dd></div>}
            </dl>
          </div>

          <div className="panel-block">
            <h2>Authorized Contacts</h2>
            {authorizedContacts.length ? authorizedContacts.map((c) => (
              <div className="admin-contact-card" key={c.id}>
                <strong>{c.fullName}</strong> {c.title && <span>— {c.title}</span>}
                <div>{c.email}{c.phone ? ` · ${c.phone}` : ""}</div>
                {c.notes && <div className="field-help">{c.notes}</div>}
              </div>
            )) : <p className="field-help">None provided.</p>}
          </div>

          <div className="panel-block">
            <h2>Systems</h2>
            <p>{(intake.systems || []).join(", ") || "None provided."}</p>
            <h2>Administrative Areas</h2>
            <p>{(intake.administrativeAreas || []).join(", ") || "None provided."}</p>
          </div>

          <div className="panel-block" style={{ gridColumn: "1 / -1" }}>
            <h2>Business Notes</h2>
            <p>{intake.businessNotes}</p>
            {intake.recurringNotes && <p>{intake.recurringNotes}</p>}
            {intake.additionalNotes && <p className="field-help">{intake.additionalNotes}</p>}
          </div>

          <div className="panel-block">
            <h2>Submission Information</h2>
            <dl className="admin-dl">
              <div><dt>Source</dt><dd>{intake.source}</dd></div>
              <div><dt>Received</dt><dd>{new Date(intake.receivedAt).toLocaleString()}</dd></div>
              {intake.reviewedAt && <div><dt>Reviewed</dt><dd>{new Date(intake.reviewedAt).toLocaleString()}</dd></div>}
            </dl>
          </div>
        </div>

        {canAct && !result && (
          <div className="admin-actions">
            {!confirmingApprove ? (
              <button className="btn-primary" onClick={() => setConfirmingApprove(true)} disabled={busy}>Approve Intake</button>
            ) : (
              <div className="admin-confirm-box">
                <p>Approve this intake and create the client?</p>
                <button className="btn-secondary" onClick={() => setConfirmingApprove(false)} disabled={busy}>Cancel</button>
                <button className="btn-primary" onClick={() => approve(!!potentialDuplicate)} disabled={busy}>Approve &amp; Create Client</button>
              </div>
            )}
            <button className="btn-secondary" onClick={() => setShowInfoForm((v) => !v)} disabled={busy}>Request More Information</button>
            <button className="btn-secondary admin-reject-btn" onClick={() => setShowRejectForm((v) => !v)} disabled={busy}>Reject Intake</button>

            {showInfoForm && (
              <div className="admin-confirm-box">
                <label>What additional information is needed?
                  <textarea rows={3} value={infoMessage} onChange={(e) => setInfoMessage(e.target.value)} />
                </label>
                <button className="btn-primary" onClick={requestInfo} disabled={busy || !infoMessage.trim()}>Send Request</button>
              </div>
            )}
            {showRejectForm && (
              <div className="admin-confirm-box">
                <p>Reject this intake? This cannot be undone.</p>
                <label>Internal reason <span className="field-optional">(optional, not shared with client)</span>
                  <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                </label>
                <button className="btn-secondary" onClick={() => setShowRejectForm(false)} disabled={busy}>Cancel</button>
                <button className="btn-primary admin-reject-btn" onClick={reject} disabled={busy}>Confirm Reject</button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export const SITE_NAME = "Aurum Ventura Enterprise LLC";
const PAGE_TITLES = {
  Home: `${SITE_NAME} — Business Administrative Services`,
  Services: `Services — ${SITE_NAME}`,
  About: `About — ${SITE_NAME}`,
  Industries: `Industries — ${SITE_NAME}`,
  HowItWorks: `How It Works — ${SITE_NAME}`,
  Security: `Security & Confidentiality — ${SITE_NAME}`,
  Privacy: `Privacy Policy — ${SITE_NAME}`,
  Terms: `Terms of Service — ${SITE_NAME}`,
  Contact: `Contact — ${SITE_NAME}`,
  Upload: `Upload Documents — ${SITE_NAME}`,
  ClientIntake: `Client Intake — ${SITE_NAME}`,
  AdminLogin: `Admin — ${SITE_NAME}`,
  AdminIntakes: `Client Intakes — ${SITE_NAME}`,
};
const PAGE_DESCRIPTIONS = {
  Home: "Outsourced administrative back-office support for small and growing businesses.",
  Services: "Recurring administrative support — document prep, invoicing, license tracking, vendor admin, data management, and more — plus a one-time Business File Reset project.",
  About: "How Aurum Ventura works: a defined scope, reserved monthly capacity, and a monthly report on what moved.",
  Industries: "Industries and business types Aurum Ventura works with, and examples of what we handle for each.",
  HowItWorks: "Our process from consultation to active service, and how custom monthly pricing is put together.",
  Security: "How Aurum Ventura handles the confidentiality, storage, and retention of your business documents and information.",
  Privacy: "What information Aurum Ventura collects through this site and its client forms, and how it's used.",
  Terms: "The terms governing use of this website and Aurum Ventura's administrative services.",
  Contact: "Request a consultation to see where administrative work is taking your time.",
  Upload: "Securely send documents and administrative requests to Aurum Ventura.",
  ClientIntake: "Complete your company information so Aurum Ventura can begin setting up your administrative services.",
  AdminLogin: "Internal Aurum Ventura administration.",
  AdminIntakes: "Internal Aurum Ventura administration.",
};

// Title + meta description for a given page key or service slug — shared
// between the client (document.title) and the static prerender step.
export function metaFor(page) {
  if (PAGE_TITLES[page]) return { title: PAGE_TITLES[page], description: PAGE_DESCRIPTIONS[page] };
  const service = SERVICES.find((s) => s.slug === page);
  if (service) return { title: `${service.title} — ${SITE_NAME}`, description: service.summary };
  if (typeof page === "string" && page.startsWith("admin-intake:")) {
    return { title: `Intake Review — ${SITE_NAME}`, description: PAGE_DESCRIPTIONS.AdminIntakes };
  }
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
    Industries: <IndustriesPage setPage={navigate} />,
    HowItWorks: <HowItWorksPage setPage={navigate} />,
    Security: <SecurityPage setPage={navigate} />,
    Privacy: <PrivacyPage setPage={navigate} />,
    Terms: <TermsPage setPage={navigate} />,
    Contact: <ContactPage />,
    Upload: <UploadPage />,
    ClientIntake: <ClientIntakePage />,
    AdminLogin: <AdminLoginPage setPage={navigate} />,
    AdminIntakes: <AdminIntakesPage setPage={navigate} />,
  };
  const service = SERVICES.find((s) => s.slug === page);
  const isAdminIntakeDetail = typeof page === "string" && page.startsWith("admin-intake:");
  const content = pages[page]
    || (service ? <ServiceDetailPage slug={page} setPage={navigate} />
    : isAdminIntakeDetail ? <AdminIntakeDetailPage intakeId={page.slice("admin-intake:".length)} setPage={navigate} />
    : pages.Home);

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
        .callout { max-width: 620px; background: ${COLORS.white}; border-left: 3px solid ${COLORS.aqua}; border-radius: 4px; padding: 1.1rem 1.4rem; font-size: 0.92rem; line-height: 1.6; color: ${COLORS.navy}; }
        .callout strong { color: ${COLORS.teal}; }
        .page-head { max-width: 1100px; margin: 0 auto; padding: 2.8rem 1.5rem 0.5rem; }
        .page-head .hero-sub { max-width: 640px; margin-bottom: 0.5rem; }
        .page-head + .section { padding-top: 1.6rem; }
        .legal-updated { color: ${COLORS.slate}; font-size: 0.85rem; }
        .legal-body { max-width: 720px; }
        .legal-body h2 { font-size: 1.15rem; margin: 1.8rem 0 0.6rem; }
        .legal-body h2:first-child { margin-top: 0; }
        .legal-body p { font-size: 0.95rem; line-height: 1.65; color: ${COLORS.slate}; margin: 0 0 1rem; }
        .legal-body a { color: ${COLORS.teal}; text-decoration: underline; }

        .plain-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.1rem 2.5rem; margin: 1.1rem 0 1.3rem; }
        .plain-grid-item { display: flex; gap: 0.7rem; align-items: baseline; padding: 0.6rem 0; border-bottom: 1px solid #E4E9EF; font-size: 0.92rem; color: ${COLORS.navy}; width: 100%; background: none; border-left: none; border-right: none; border-top: none; text-align: left; font-family: inherit; cursor: pointer; }
        .plain-grid-item:hover { color: ${COLORS.teal}; border-bottom-color: ${COLORS.teal}; }
        .plain-grid-item h3 { font: inherit; font-weight: inherit; color: inherit; margin: 0; }
        .plain-num { color: ${COLORS.teal}; font-weight: 600; font-size: 0.8rem; }
        .badge-one-time { display: inline-block; margin-left: 0.6rem; background: ${COLORS.ice}; color: ${COLORS.teal}; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 20px; vertical-align: middle; }
        .badge-one-time-h1 { font-size: 0.68rem; vertical-align: super; margin-left: 0.8rem; }
        @media (max-width: 640px) { .plain-grid { grid-template-columns: 1fr; } }

        .testimonial-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 1.4rem; }
        .testimonial-card { background: ${COLORS.white}; border-left: 3px solid ${COLORS.aqua}; border-radius: 4px; padding: 1.4rem 1.5rem; margin: 0; box-shadow: 0 1px 3px rgba(4,25,68,0.06); }
        .testimonial-quote { font-style: italic; font-size: 0.92rem; line-height: 1.6; color: ${COLORS.navy}; margin: 0 0 1rem; }
        .testimonial-card footer { display: flex; align-items: center; gap: 0.8rem; }
        .testimonial-avatar { flex-shrink: 0; width: 38px; height: 38px; border-radius: 50%; background: ${COLORS.ice}; color: ${COLORS.teal}; display: flex; align-items: center; justify-content: center; }
        .testimonial-avatar svg { width: 22px; height: 22px; }
        .testimonial-attribution { display: flex; flex-direction: column; }
        .testimonial-name { font-weight: 600; font-size: 0.88rem; color: ${COLORS.navy}; }
        .testimonial-business { font-size: 0.82rem; color: ${COLORS.teal}; }
        .testimonial-industry { font-size: 0.75rem; color: ${COLORS.slate}; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 0.2rem; }
        @media (max-width: 860px) { .testimonial-grid { grid-template-columns: 1fr; } }

        .cost-list { max-width: 620px; margin: 1.3rem 0 1.6rem; }
        .cost-row { display: flex; justify-content: space-between; gap: 1rem; padding: 0.65rem 0; border-bottom: 1px solid #D6E4EA; font-size: 0.92rem; color: ${COLORS.navy}; }
        .cost-row:first-child { border-top: 1px solid #D6E4EA; }
        .cost-hours { color: ${COLORS.teal}; font-weight: 600; white-space: nowrap; }
        .cost-total { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.2rem, 2.6vw, 1.5rem); font-weight: 600; line-height: 1.4; color: ${COLORS.navy}; max-width: 620px; margin: 0; }

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

        /* Upload */
        .btn-secondary { background: ${COLORS.white}; color: ${COLORS.teal}; border: 1px solid ${COLORS.teal}; padding: 0.6rem 1rem; font-size: 0.85rem; font-weight: 600; }
        .btn-secondary:hover { background: ${COLORS.ice}; }
        .upload-layout { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 3rem; align-items: start; }
        .upload-explain h2 { margin-bottom: 0.7rem; }
        .upload-explain p { margin-bottom: 1.2rem; }
        .upload-notice { background: ${COLORS.ice}; border-left: 3px solid ${COLORS.teal}; color: ${COLORS.navy}; font-size: 0.85rem; line-height: 1.55; padding: 0.9rem 1rem; }
        .upload-form { position: relative; }
        .field-help { font-weight: 500; font-size: 0.78rem; color: ${COLORS.slate}; text-transform: none; letter-spacing: 0; margin-top: -0.15rem; }
        .field-optional { font-weight: 500; text-transform: none; letter-spacing: 0; color: ${COLORS.slate}; }
        .upload-error { background: #FBEAEA; border-left: 3px solid #B3261E; color: #7A241E; font-size: 0.85rem; padding: 0.75rem 0.9rem; }
        .upload-dropzone-label { display: block; font-size: 0.82rem; font-weight: 600; color: ${COLORS.navy}; margin-bottom: 0.4rem; }
        .upload-dropzone { border: 1.5px dashed #C9D3DC; padding: 1.6rem 1rem; text-align: center; cursor: pointer; background: ${COLORS.white}; transition: border-color 0.15s ease, background 0.15s ease; }
        .upload-dropzone:hover, .upload-dropzone:focus-visible { border-color: ${COLORS.teal}; outline: none; }
        .upload-dropzone.active { border-color: ${COLORS.aqua}; background: ${COLORS.ice}; }
        .upload-dropzone p { font-size: 0.88rem; margin-bottom: 0.7rem; }
        .upload-dropzone-actions { display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap; margin-bottom: 0.7rem; }
        .upload-dropzone-hint { font-size: 0.75rem; color: ${COLORS.slate}; margin-bottom: 0 !important; }
        .upload-file-list { list-style: none; margin: 0.8rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
        .upload-file-row { display: flex; align-items: center; gap: 0.7rem; border: 1px solid #E4E9EF; padding: 0.5rem 0.7rem; font-size: 0.82rem; }
        .upload-file-row.error { border-color: #F3C6C3; background: #FBEAEA; }
        .upload-file-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .upload-file-name { color: ${COLORS.navy}; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .upload-file-size { color: ${COLORS.slate}; font-size: 0.75rem; }
        .upload-progress-track { width: 80px; height: 5px; background: #E4E9EF; flex-shrink: 0; }
        .upload-progress-fill { height: 100%; background: ${COLORS.aqua}; transition: width 0.15s ease; }
        .upload-file-status { flex-shrink: 0; font-weight: 600; }
        .upload-file-status.done { color: #137333; }
        .upload-file-status.error { color: #B3261E; }
        .upload-file-remove { background: none; border: none; color: ${COLORS.slate}; font-size: 1.1rem; line-height: 1; cursor: pointer; flex-shrink: 0; padding: 0 0.2rem; }
        .upload-file-remove:hover { color: #B3261E; }
        .upload-form .btn-primary:disabled { background: #C9D3DC; cursor: not-allowed; }
        .upload-confirm-panel { max-width: 480px; border: 1px solid #E4E9EF; }
        .upload-confirm-row { display: flex; justify-content: space-between; gap: 1rem; padding: 0.8rem 1rem; border-bottom: 1px solid #E4E9EF; font-size: 0.9rem; }
        .upload-confirm-row:last-child { border-bottom: none; }
        .upload-confirm-row span { color: ${COLORS.slate}; }
        .upload-confirm-row strong { color: ${COLORS.navy}; text-align: right; }
        @media (max-width: 800px) {
          .upload-layout { grid-template-columns: 1fr; }
        }

        /* Client Intake */
        .intake-form { max-width: 640px; }
        .intake-section-title { font-size: 1.15rem; margin: 1.4rem 0 0.2rem; padding-top: 1.2rem; border-top: 1px solid #E4E9EF; }
        .intake-form > .intake-section-title:first-of-type { border-top: none; padding-top: 0; margin-top: 0.4rem; }
        .intake-contact-row { border: 1px solid #E4E9EF; padding: 0.9rem; display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 0.6rem; }
        .intake-remove-contact { align-self: flex-start; background: none; border: none; color: #B3261E; font-size: 0.78rem; font-weight: 600; padding: 0; cursor: pointer; }
        .intake-checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; margin-bottom: 0.9rem; }
        .intake-checkbox { display: flex !important; flex-direction: row !important; align-items: center; gap: 0.5rem; font-size: 0.85rem !important; font-weight: 500 !important; text-transform: none !important; color: ${COLORS.navy}; }
        .intake-checkbox input { width: auto; }
        @media (max-width: 560px) { .intake-checkbox-grid { grid-template-columns: 1fr; } }

        /* Admin */
        .admin-title-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .admin-table-wrap { overflow-x: auto; }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .admin-table th { text-align: left; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: ${COLORS.slate}; padding: 0 0.7rem 0.6rem; border-bottom: 1.5px solid ${COLORS.navy}; white-space: nowrap; }
        .admin-table td { padding: 0.7rem; border-bottom: 1px solid #E4E9EF; white-space: nowrap; }
        .admin-table a { color: ${COLORS.teal}; font-weight: 600; }
        .admin-status { display: inline-block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; padding: 0.2rem 0.55rem; border-radius: 2px; }
        .admin-status-pending-review { background: ${COLORS.ice}; color: ${COLORS.teal}; }
        .admin-status-approved { background: #E5F5EA; color: #137333; }
        .admin-status-rejected { background: #FBEAEA; color: #B3261E; }
        .admin-status-more-information-required { background: #FEF2DE; color: #B45309; }
        .admin-review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin-bottom: 1.6rem; }
        .panel-block { border: 1px solid #E4E9EF; padding: 1rem 1.1rem; }
        .panel-block h2 { font-size: 1rem; margin-bottom: 0.6rem; }
        .panel-block p { margin-bottom: 0.5rem; }
        .admin-dl div { display: flex; justify-content: space-between; gap: 1rem; padding: 0.35rem 0; border-bottom: 1px solid #F0F2F5; font-size: 0.85rem; }
        .admin-dl dt { color: ${COLORS.slate}; flex-shrink: 0; }
        .admin-dl dd { margin: 0; text-align: right; color: ${COLORS.navy}; }
        .admin-contact-card { padding: 0.6rem 0; border-bottom: 1px solid #F0F2F5; font-size: 0.85rem; }
        .admin-contact-card:last-child { border-bottom: none; }
        .admin-actions { display: flex; gap: 0.7rem; flex-wrap: wrap; border-top: 1px solid #E4E9EF; padding-top: 1.2rem; }
        .admin-reject-btn { border-color: #B3261E; color: #B3261E; }
        .admin-confirm-box { border: 1px solid #E4E9EF; background: ${COLORS.ice}; padding: 1rem; display: flex; flex-direction: column; gap: 0.7rem; width: 100%; }
        .admin-confirm-box label { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.82rem; font-weight: 600; color: ${COLORS.navy}; }
        .admin-confirm-box textarea { font-family: 'Montserrat', sans-serif; font-size: 0.88rem; padding: 0.5rem 0.6rem; border: 1px solid #C9D3DC; }
        .admin-warning-banner { background: #FEF2DE; border-left: 3px solid #B45309; color: #7A4A0A; font-size: 0.85rem; padding: 0.75rem 0.9rem; margin-bottom: 1rem; }
        .admin-result-banner { background: #E5F5EA; border-left: 3px solid #137333; color: #0E5226; font-size: 0.85rem; padding: 0.75rem 0.9rem; margin-bottom: 1rem; }
        @media (max-width: 700px) {
          .admin-review-grid { grid-template-columns: 1fr; }
        }

        /* Footer */
        .footer { background: ${COLORS.navy}; color: ${COLORS.white}; padding: 3rem 1.5rem 0; margin-top: 1.5rem; }
        .footer-inner { max-width: 1100px; margin: 0 auto; padding-bottom: 1.5rem; }
        .footer-cols { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2rem 1.5rem; width: 100%; }
        .footer-cols > div { flex: 1 1 180px; }
        .footer-cols h3 { font-family: 'Montserrat', sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${COLORS.aqua}; margin-bottom: 0.8rem; }
        .footer-cols a { display: block; background: none; border: none; color: rgba(255,255,255,0.8); font-size: 0.87rem; padding: 0.3rem 0; text-align: left; }
        .footer-cols a:hover { color: ${COLORS.white}; }
        .footer-contact { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 0.3rem; }
        .footer-legal-bar { width: 100%; margin-top: 1.5rem; padding: 1.4rem 1.5rem 1.6rem; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; }
        .footer-legal { color: rgba(255,255,255,0.55); font-size: 0.78rem; margin: 0; }
        .footer-legal-links { margin: 0.6rem 0 0; font-size: 0.82rem; }
        .footer-legal-links a { color: rgba(255,255,255,0.8); text-decoration: underline; text-underline-offset: 2px; }
        .footer-legal-links a:hover { color: ${COLORS.white}; }
        .footer-legal-links span { color: rgba(255,255,255,0.35); margin: 0 0.6rem; }
      ` }} />

      <Nav page={page} setPage={navigate} />
      {content}
      <Footer setPage={navigate} />
    </div>
  );
}
