import React, { useState, useEffect } from "react";

const LOGO_MARK = "data:image/png;base64,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";

const COLORS = {
  navy: "#041944",
  teal: "#09748B",
  aqua: "#26AEB4",
  ice: "#E6F3F9",
  slate: "#57677F",
  white: "#FFFFFF",
};

const SERVICES = [
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

// Real, shareable URLs for every page. Home/Services/About/Contact map to
// fixed paths; anything else is treated as a service slug under /services/.
function pathFor(key) {
  switch (key) {
    case "Home": return "/";
    case "Services": return "/services";
    case "About": return "/about";
    case "Contact": return "/contact";
    default: return "/services/" + key;
  }
}

function pageFromPath(pathname) {
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
          <img src={LOGO_MARK} alt="Aurum Ventura" className="nav-mark" />
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
        <button className="nav-burger" onClick={() => setOpen(!open)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>
      {open && (
        <div className="nav-mobile">
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
            <h4>Company</h4>
            <a href={pathFor("About")} onClick={go("About")}>About</a>
            <a href={pathFor("Services")} onClick={go("Services")}>Services</a>
          </div>
          <div>
            <h4>Get in touch</h4>
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

function HomePage({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
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
        <h2>What We Handle</h2>
        <div className="plain-grid">
          {SERVICES.map((s, i) => (
            <a className="plain-grid-item" key={s.slug} href={pathFor(s.slug)} onClick={go(s.slug)}>
              <span className="plain-num">{String(i + 1).padStart(2, "0")}</span>
              <span>{s.title}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="section alt">
        <h2>Who We Work With</h2>
        <p className="section-lead">
          Businesses with real administrative volume but no dedicated staff to own it —
          growing operations that need consistency, not a full-time hire.
        </p>
        <div className="tag-list">
          {AUDIENCE.map((a) => (
            <span className="tag" key={a}>{a}</span>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>What We're Not</h2>
        <p className="section-lead">
          We're an administrative back office, not a virtual assistant marketplace, a law firm,
          or an accounting firm. To keep that boundary clear, we don't provide:
        </p>
        <ul className="plain-list">
          {NOT_LIST.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </section>

      <section className="cta-band">
        <h2>Ready to see where things stand?</h2>
        <p>A short consultation to understand what's actually taking time — no pressure, no commitment.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Request a Consultation</a>
      </section>
    </div>
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
          <a className="service-row" key={s.slug} href={pathFor(s.slug)} onClick={go(s.slug)}>
            <h3>{String(i + 1).padStart(2, "0")} &middot; {s.title}</h3>
            <p>{s.summary}</p>
            <span className="service-row-link">View examples &rarr;</span>
          </a>
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
        <h2>Our Process</h2>
        <div className="steps">
          {STEPS.map(([title, text], i) => (
            <div className="step" key={title}>
              <div className="step-num">{i + 1}</div>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="section alt">
        <h2>What Stays With You</h2>
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
            <h4>Direct Contact</h4>
            <p>[BUSINESS EMAIL]</p>
            <p>[BUSINESS PHONE]</p>
            <h4>Typical Response</h4>
            <p>Within one business day.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

const SITE_NAME = "Aurum Ventura Enterprise LLC";
const PAGE_TITLES = {
  Home: `${SITE_NAME} — Business Administrative Services`,
  Services: `Services — ${SITE_NAME}`,
  About: `About — ${SITE_NAME}`,
  Contact: `Contact — ${SITE_NAME}`,
};

export default function App() {
  const [page, setPage] = useState(() => pageFromPath(window.location.pathname));

  // Keeps the browser URL in sync with the current page — real, shareable
  // links, plus back/forward support via the popstate listener below.
  const navigate = (key) => {
    if (key !== page) window.history.pushState({}, "", pathFor(key));
    setPage(key);
  };

  useEffect(() => {
    const onPopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    const service = SERVICES.find((s) => s.slug === page);
    document.title = PAGE_TITLES[page] || (service ? `${service.title} — ${SITE_NAME}` : PAGE_TITLES.Home);
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Montserrat:wght@400;500;600;700&display=swap');

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
        .plain-num { color: ${COLORS.aqua}; font-weight: 600; font-size: 0.8rem; }
        @media (max-width: 640px) { .plain-grid { grid-template-columns: 1fr; } }

        .tag-list { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1rem; }
        .tag { border: 1px solid ${COLORS.teal}; color: ${COLORS.teal}; font-size: 0.82rem; font-weight: 500; padding: 0.35rem 0.9rem; }

        .plain-list { margin: 0.8rem 0 0; padding-left: 1.2rem; color: ${COLORS.slate}; }
        .plain-list li { margin-bottom: 0.5rem; line-height: 1.5; }

        .cta-band { text-align: center; padding: 2.8rem 1.5rem; border-top: 1px solid #E4E9EF; }
        .cta-band h2 { margin-bottom: 0.5rem; }
        .cta-band p { margin-bottom: 1.1rem; }

        .service-row { display: block; padding: 1.1rem 0; border-bottom: 1px solid #E4E9EF; max-width: 720px; width: 100%; background: none; border-left: none; border-right: none; border-top: none; text-align: left; font-family: inherit; cursor: pointer; }
        .service-row:first-child { padding-top: 0; }
        .service-row-link { display: inline-block; margin-top: 0.5rem; color: ${COLORS.teal}; font-size: 0.85rem; font-weight: 600; }
        .service-row:hover h3 { color: ${COLORS.teal}; }
        .service-row:hover .service-row-link { color: ${COLORS.navy}; }

        .back-link { display: inline-block; margin-bottom: 1rem; }

        /* Steps */
        .steps { display: flex; flex-direction: column; gap: 1.3rem; max-width: 640px; }
        .step { display: flex; gap: 1.2rem; }
        .step-num { flex-shrink: 0; width: 34px; height: 34px; border: 1.5px solid ${COLORS.aqua}; color: ${COLORS.navy}; font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: 1rem; display: flex; align-items: center; justify-content: center; }

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
        .contact-side h4 { font-size: 0.78rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: ${COLORS.teal}; margin: 1.4rem 0 0.4rem; }
        .contact-side h4:first-child { margin-top: 0; }
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
        .footer-cols h4 { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${COLORS.aqua}; margin-bottom: 0.8rem; }
        .footer-cols a { display: block; background: none; border: none; color: rgba(255,255,255,0.8); font-size: 0.87rem; padding: 0.3rem 0; text-align: left; }
        .footer-cols a:hover { color: ${COLORS.white}; }
        .footer-contact { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 0.3rem; }
        .footer-legal { text-align: center; color: rgba(255,255,255,0.45); font-size: 0.78rem; margin-top: 1.2rem; }
      `}</style>

      <Nav page={page} setPage={navigate} />
      {content}
      <Footer setPage={navigate} />
    </div>
  );
}
