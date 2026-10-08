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
};// ============================================
// Organization JSON-LD & Google Business
// ============================================
// PASTE YOUR GOOGLE BUSINESS PROFILE URL HERE:
const GOOGLE_BUSINESS_URL = "https://share.google/RR4rQeNwXhJky9eVF";

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Aurum Ventura Enterprise LLC",
  "url": "https://www.aurumventura.net",
  "logo": "https://www.aurumventura.net/logo-mark.png",
  "description": "Outsourced back-office administrative services for small and growing businesses across the United States.",
  "telephone": "+1-850-653-7797",
  "email": "admin@aurumventura.net",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Nashville",
    "addressRegion": "TN",
    "addressCountry": "US"
  },
  "areaServed": { "@type": "Country", "name": "United States" },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-850-653-7797",
    "email": "admin@aurumventura.net",
    "contactType": "customer service"
  },
  "sameAs": GOOGLE_BUSINESS_URL !== "YOUR_GOOGLE_BUSINESS_URL_HERE" ? [GOOGLE_BUSINESS_URL] : [],
  "priceRange": "$$",
  "knowsAbout": ["Administrative Support", "Back Office Services", "Document Management", "Invoice Administration", "CRM Management", "Project Administration"]
};



export const SERVICES = [
  {
    slug: "document-preparation-management",
    title: "Document Preparation & Management",
    summary: "Organize your documents, maintain a clean digital filing system, and prepare routine administrative documents — trackers, checklists, forms, and reports.",
    intro: ["Documents pile up across drives, inboxes, and desktops, and the same report gets rebuilt from scratch each month. We set up a filing structure your team can keep using, then prepare the routine documents you need: trackers, checklists, forms, and reports.", "Every project starts from the information you provide. We organize it, prepare the document, and file it where your team can find it."],
    faq: [{"q": "Where are my documents stored?", "a": "Client documents are stored in Dropbox, which encrypts data in transit and at rest. Our Security & Confidentiality page covers how information is handled."}, {"q": "Can you prepare legal or tax documents?", "a": "We prepare routine administrative documents. Anything that needs a licensed professional's judgment stays with that professional."}],
    examples: [
      "Setting up a consistent folder structure across your business documents",
      "Preparing a weekly operations checklist from your notes",
      "Compiling a monthly summary report from data you provide",
    ],
  },
  {
    slug: "invoice-administration",
    title: "Invoice Administration",
    summary: "Prepare and send invoices, track payments and due dates, keep records organized. (No debt collection.)",
    intro: ["Late invoices slow cash flow, and invoices that never go out are the most expensive kind. We prepare and send invoices once you approve the amount and recipient, log each payment's status, and flag due dates before they pass.", "Every invoice goes into a running log by client or job, so you always know what has been sent, what has been paid, and what is still open."],
    faq: [{"q": "Do you chase unpaid invoices?", "a": "We track payment status and flag due dates. We do not do debt collection."}, {"q": "Who approves the amounts on an invoice?", "a": "You do. We send an invoice only after you approve its amount and recipient."}],
    examples: [
      "Preparing and sending an invoice once you approve the amount and recipient",
      "Logging payment status and flagging invoices approaching their due date",
      "Maintaining a running invoice log by client or job",
    ],
  },
  {
    slug: "license-renewal-tracking",
    title: "License & Renewal Tracking",
    summary: "Record and track licenses, permits, certifications, and insurance — so nothing lapses. (We track administratively; you determine what's legally required.)",
    intro: ["A lapsed license or insurance certificate can stop work before the renewal fee even matters. We build a renewal calendar for your licenses, permits, certifications, and insurance, send reminders ahead of each date, and file the confirmations and updated documents as they arrive.", "We track the deadlines administratively. Your state licensing board and your insurer decide what is required and when."],
    examples: [
      "Building a renewal calendar for your business license, permits, and certifications",
      "Sending you a reminder ahead of an upcoming expiration date",
      "Filing renewal confirmations and updated documents as they come in",
    ],
    faq: [
      {
        q: "How do I keep track of business license renewals and expiration dates?",
        a: "Keep one renewal calendar for every license, permit, and certification, with each expiration date and the agency that issues it. Set reminders 60 and 30 days before each date, and file each renewal confirmation with the license record. We can build and maintain that calendar for you. Your state licensing board sets the requirements and deadlines.",
      },
    ],
  },
  {
    slug: "vendor-administration",
    title: "Vendor Administration",
    seoTitle: "Vendor Administration, W-9 & COI Collection",
    summary: "Collect and organize vendor W-9s and Certificates of Insurance, track expiration dates, and keep vendor records current.",
    intro: ["Vendor paperwork is a compliance risk. A missing W-9 holds up year-end 1099 reporting, and an expired certificate of insurance leaves your business exposed when a vendor is on your job.", "We collect and organize vendor W-9s and Certificates of Insurance, keep a directory of vendor contacts, log each expiration date, and flag a certificate before it lapses."],
    faq: [{"q": "Why collect a W-9 from every vendor?", "a": "The W-9 gives you a vendor's legal name, taxpayer identification number, and federal tax classification, which you need to report payments accurately at tax time."}, {"q": "Do you verify coverage limits and endorsements?", "a": "We track and file the certificates. Your team or your broker reviews coverage limits and endorsements."}],
    examples: [
      "Building and maintaining a vendor contact directory",
      "Collecting and organizing W-9s and Certificates of Insurance",
      "Flagging a vendor's insurance certificate before it lapses",
    ],
  },
  {
    slug: "crm-data-management",
    title: "CRM & Data Management",
    summary: "Enter and update customer records, clean up duplicates, maintain spreadsheets, and handle routine Data Entry — keep your systems accurate.",
    intro: ["Duplicate and outdated contacts waste sales time and make your reports unreliable. We enter new customer records after a sale closes, clean up duplicate and outdated entries, and keep your spreadsheets current.", "We work with the information you send us, in the CRM or spreadsheets you already use."],
    faq: [{"q": "Where does the information come from?", "a": "You send it to us, in the form that's easiest for you: a spreadsheet, a list, notes, or documents. We enter and update what you provide."}, {"q": "Do you work in our existing CRM?", "a": "Yes. We work in the CRM or spreadsheets you already use."}],
    examples: [
      "Entering new customer records into your CRM after a sale closes",
      "Cleaning up duplicate or outdated contact entries",
      "Updating spreadsheets with information you send over",
    ],
  },
  {
    slug: "project-administration",
    title: "Project Administration",
    summary: "Create and maintain project folders, trackers, and documentation. Update status and prepare progress reports.",
    intro: ["Projects slip when the paperwork falls behind the work. We set up a folder and tracker for each job, update its status as it moves through each stage, and prepare progress reports so you can see where every project stands.", "Documentation stays with the job it belongs to, so it's easy to find when a client, a subcontractor, or your team needs it."],
    faq: [{"q": "What do you need from us to start?", "a": "Job information, status updates, and the documents for each project, sent in whatever form your team already uses."}, {"q": "Do you work in ProWorx?", "a": "Yes, we use ProWorx for project tracking."}],
    examples: [
      "Setting up a project folder and tracker for a new job",
      "Updating status fields as a project moves through its stages",
      "Preparing a weekly progress summary for work in progress",
    ],
  },
  {
    slug: "forms-paperwork",
    title: "Forms & Paperwork",
    summary: "Prepare routine business forms, applications, checklists, and internal paperwork using information you supply. (Licensed professionals handle anything requiring their judgment.)",
    metaDescription: "Routine business forms, checklists, and internal paperwork, prepared from information you supply. Licensed professionals handle the rest.",
    intro: ["Routine forms and checklists take time that owners rarely have. We prepare applications, checklists, and internal paperwork from the information you supply, so each form is complete before it goes out.", "You review each form before it is used. Anything that needs a licensed professional's judgment stays with that professional."],
    faq: [{"q": "Who checks the content of a form?", "a": "You review every form before it is used. Licensed professionals handle anything that requires their judgment."}, {"q": "Can you prepare client-facing forms?", "a": "Yes. We prepare routine business forms and checklists from the information you supply."}],
    examples: [
      "Filling out a routine application form with information you supply",
      "Preparing an internal checklist for a recurring process",
      "Formatting and organizing paperwork ahead of a deadline",
    ],
  },
  {
    slug: "data-entry-reporting",
    title: "Data Entry & Reporting",
    summary: "Spreadsheets, data cleanup, and monthly operational reports — recurring reporting without the time cost.",
    intro: ["Spreadsheets drift out of date, and monthly reports get rebuilt by hand. We clean up your data, enter the information you send, and prepare the recurring operational reports your business relies on.", "Reports are built from the data you provide, on the schedule you set, so the numbers you review are current."],
    faq: [{"q": "What kinds of reports do you prepare?", "a": "Monthly operational reports and performance summaries, built from the data you provide."}, {"q": "How is my data kept secure?", "a": "Documents and data are stored in Dropbox, which encrypts them in transit and at rest. Our Security & Confidentiality page covers the details."}],
    examples: [
      "Entering weekly sales or job data into a tracking spreadsheet",
      "Cleaning up and standardizing an existing spreadsheet",
      "Preparing a monthly operational summary report",
    ],
  },
  {
    slug: "general-administrative-support",
    title: "General Administrative Support",
    summary: "Routine administrative work within your approved scope. Every plan has defined scope and reserved capacity — that's what protects both sides.",
    intro: ["Some work doesn't fit neatly into one category. General administrative support covers routine tasks within a scope you approve in advance, with capacity reserved so the work gets done on time.", "The scope is set in your service agreement. Work outside it is quoted separately, and only goes ahead with your approval."],
    faq: [{"q": "What counts as in scope?", "a": "Only the tasks listed in the scope you approve. Anything outside it is quoted separately."}, {"q": "How is capacity reserved?", "a": "Each plan has a defined scope and reserved capacity, set out in your service agreement."}],
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
    summary: "One-time cleanup and organization service for your digital files and folders. Every project is custom-scoped and quoted based on your current setup.",
    intro: ["A one-time cleanup of your digital files and folders. We archive outdated files, consolidate duplicates, and set up a folder structure your team can keep using after the project ends.", "Each project is custom-scoped and quoted from your current setup. There is no ongoing commitment."],
    faq: [{"q": "Is this an ongoing service?", "a": "No. It's a one-time project with no ongoing commitment."}, {"q": "What happens to outdated files?", "a": "They are archived, not removed, and the folder structure is set up so new files go to the right place."}],
    examples: [
      "Auditing and reorganizing a messy shared drive or folder structure",
      "Standardizing file and folder naming conventions across your business",
      "Archiving outdated files and consolidating duplicates into a clean system",
    ],
  },
  {
    slug: "back-office-setup",
    title: "Back Office Set Up",
    oneTime: true,
    summary: "Initial setup and configuration of your back-office systems, processes, and administrative infrastructure. Customize your scope based on your business needs.",
    intro: ["Setup is where the rest of the engagement begins. We configure your back-office systems, processes, and administrative workflows, then set up the vendor files, license tracking, and document organization your team will use day to day.", "Your scope is built around how your business actually runs, so the setup fits your work rather than a generic template."],
    faq: [{"q": "What do you need to start?", "a": "Your current systems, documents, and priorities. We use them to build your scope."}, {"q": "Is setup priced separately from ongoing support?", "a": "Every engagement is quoted from a custom scope of services, so pricing depends on the setup your business needs."}],
    examples: [
      "Building a CRM from scratch and populating with existing customer data",
      "Creating administrative workflows and tracking systems for your business",
      "Setting up vendor files, License Tracking, and Document Organization systems",
      "Designing invoicing processes and payment tracking workflows",
    ],
  },
];

const AUDIENCE = [
  "Contractors & Trades", "Property Management", "Cleaning & Facility Services", "Construction/Subcontractors",
  "Staffing & Recruiting", "Real Estate", "Professional Services",
];

const STEPS = [
  ["Needs Assessment", "We document what's actually taking time and where a defined scope would help."],
  ["Proposal", "A written recommendation outlining your custom scope, reserved capacity, and monthly service fee."],
  ["Agreement & Scope", "The Master Agreement and your Scope & Service Level Exhibit are signed."],
  ["Active Service", "Requests go through, tracked against capacity, with a monthly report on what moved."],
];

const NOT_LIST = [
  "Cold calling or lead generation",
  "Debt collection",
  "Legal, tax, or accounting advice",
  "Compliance guarantees or regulatory determinations",
  "We also don't replace your accounting, legal, or industry-specific professionals — we support the administrative work around them.",
];

const CONFIDENTIALITY_PRINCIPLES = [
  ["Limited access", "Client information is accessed only as needed to perform agreed administrative services."],
  ["Purpose-based handling", "Documents and business information are used only for the administrative responsibilities authorized by the client."],
  ["Organized digital workflows", "We encourage structured digital Document Management rather than unnecessary duplication or uncontrolled distribution of business information."],
  ["Client control", "Clients determine what information Aurum Ventura receives and which administrative responsibilities we are authorized to manage."],
  ["Responsible communication", "Sensitive business information is not intentionally shared with unauthorized third parties."],
  ["Human oversight", "Technology may assist with organization, classification, or routine processing, but sensitive administrative work remains subject to human review where appropriate."],
  ["Clear offboarding", "When a client relationship ends, access to client systems, documents, folders, and administrative resources is reviewed and removed as appropriate."],
];

const TIME_COST = [
  ["Invoicing & payment follow-up", "2–3 hrs/wk"],
  ["Filing & Document Organization", "2 hrs/wk"],
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
  "Contractors & Trades": ["Project documentation", "Invoice Administration", "License & permit tracking", "Vendor records"],
  "Property Management": ["Property & Vendor Records", "Vendor Documentation", "Monthly Reporting", "CRM Updates"],
  "Cleaning & Facility Services": ["Client Invoicing", "Service Scheduling", "Equipment Tracking", "Performance Reports"],
  "Construction/Subcontractors": ["Project Documentation", "Subcontractor Management", "Job Costing", "Compliance Records"],
  "Staffing & Recruiting": ["Candidate Tracking", "Placement Documentation", "Client Reporting", "Contract Management"],
  "Real Estate": ["Transaction Paperwork", "Document Organization", "CRM Updates", "Vendor Records"],
  "Professional Services": ["CRM Updates", "Document Management", "Invoice Administration", "Status Reporting"],
};

// Maps example labels to service slugs for internal linking
const EXAMPLE_TO_SERVICE = {
  "Invoice Administration": "invoice-administration",
  "CRM & Data Updates": "crm-data-management",
  "CRM Updates": "crm-data-management",
  "Recurring Status Reporting": "data-entry-reporting",
  "Status Reporting": "data-entry-reporting",
  "Forms & Paperwork": "forms-paperwork",
  "License & permit tracking": "license-renewal-tracking",
  "Property & Vendor Records": "vendor-administration",
  "Vendor documentation": "vendor-administration",
  "Vendor records": "vendor-administration",
  "Monthly Reporting": "data-entry-reporting",
  "Client invoicing": "invoice-administration",
  "Service scheduling": "project-administration",
  "Equipment tracking": "project-administration",
  "Performance reports": "data-entry-reporting",
  "Project documentation": "project-administration",
  "Subcontractor management": "vendor-administration",
  "Job costing": "data-entry-reporting",
  "Compliance records": "document-preparation-management",
  "Candidate tracking": "crm-data-management",
  "Placement documentation": "document-preparation-management",
  "Client reporting": "data-entry-reporting",
  "Contract management": "document-preparation-management",
  "Transaction paperwork": "forms-paperwork",
  "Document organization": "document-preparation-management",
  "Document management": "document-preparation-management",
};

// Shared sections for industry pages. Each page's copy is tailored above them.
const HOW_IT_WORKS = {
  heading: "How it works",
  steps: [
    "Tell us what you need. Share the tasks that take the most time.",
    "We build a scope. You get a Scope of Services built around your jobs and your team.",
    "Get your custom quote. Pricing is custom and follows the scope.",
  ],
};
const PRICING_FAQ = {
  q: "How is pricing set?",
  a: "Every engagement is quoted from a custom scope of services. Pricing is custom, not a set package.",
};

// Approved copy for industry pages that need more than the generic template.
// Rendered by IndustryDetailPage; the industry name stays the H1.
const INDUSTRY_PAGE_COPY = {
  "Contractors & Trades": {
    h1: "Outsourced administrative support for contractors & trades",
    metaTitle: "Admin Support for Contractors & Trades | Aurum Ventura",
    metaDescription: "Remote administrative support for contractors and trades: job folders, progress reports, invoices, and license and insurance tracking.",
    heroSub: "The paperwork behind every job, handled remotely, so you can stay on the job site.",
    sections: [
      {
        heading: "The office work that follows the crew",
        paragraphs: [
          "Every job creates paperwork: a project folder, progress updates, change orders, invoices, and renewal dates for licenses and insurance. Someone has to track it, and on a small crew that is usually the owner, after hours.",
          "When it slips, the cost shows up as late invoices, lapsed certificates, and a folder nobody can find.",
        ],
      },
      {
        heading: "Example: a new job, start to finish",
        note: "Illustrative example, not a client case.",
        steps: [
          "A new job is booked. We set up the job folder and tracker in ProWorx.",
          "As the job moves through each stage, we update its status and file the change orders and permits.",
          "Invoices go out against the work orders, and missing paperwork is flagged before billing.",
          "Every Friday, you get a short progress summary for each open job.",
        ],
      },
      {
        heading: "Who we work with",
        paragraphs: ["Owner-operated and growing businesses in:"],
        bullets: [
          "General contractors and remodelers",
          "Specialty trades, including electrical, plumbing, HVAC, and roofing",
        ],
        after: "If you run a crew and the office work is piling up on you, we can help. Tell us your trade on the contact page.",
      },
      {
        heading: "How it works",
        steps: [
          "Tell us what you need. Share the tasks that take the most time.",
          "We build a scope. You get a Scope of Services built around your jobs and your team.",
          "Get your custom quote. Pricing is custom and follows the scope.",
        ],
      },
      {
        heading: "Common questions",
        faq: [
          {
            q: "Do you decide which licenses or permits I need?",
            a: "No. We track deadlines and paperwork. Your state licensing board sets the requirements.",
          },
          {
            q: "Do you work in ProWorx?",
            a: "Yes, we use ProWorx for project tracking.",
          },
          {
            q: "How is pricing set?",
            a: "Every engagement is quoted from a custom scope of services. Pricing is custom, not a set package.",
          },
        ],
      },
    ],
  },
  "Property Management": {
    h1: "Outsourced administrative support for property managers",
    metaTitle: "Admin Support for Property Management | Aurum Ventura",
    metaDescription: "Remote administrative support for property managers: vendor files, insurance certificates, invoices, and monthly reports.",
    heroSub: "Vendor files, insurance certificates, and monthly reports, kept current so your properties run without a paperwork backlog.",
    sections: [
      {
        heading: "The paperwork behind every property",
        paragraphs: [
          "Each property depends on vendors whose insurance certificates and records expire on their own schedule. When one lapses unnoticed, the cost shows up as an uninsured repair or a vendor you can't pay.",
          "Monthly reporting and vendor records pile up on the same desk, usually the manager's, and get done last.",
        ],
      },
      {
        heading: "Example: a vendor joins the portfolio",
        note: "Illustrative example, not a client case.",
        steps: [
          "A new vendor is onboarded. We set up its file and collect its W-9 and certificate of insurance.",
          "We log the expiration date and flag the certificate before it lapses.",
          "When a renewed certificate arrives, we file it and update the vendor record.",
          "Each month, you get a summary of vendor files and open items.",
        ],
      },
      {
        heading: "Who we work with",
        paragraphs: ["Owner-operated and growing businesses in:"],
        bullets: [
          "Residential property management",
          "Commercial property management",
          "Small and mid-size management companies",
        ],
        after: "If your team is buried in vendor files and monthly reports, tell us on the contact page and we'll scope it.",
      },
      HOW_IT_WORKS,
      {
        heading: "Common questions",
        faq: [
          {
            q: "Do you track vendor insurance certificates?",
            a: "Yes. We log expiration dates, flag certificates before they lapse, and file renewed certificates.",
          },
          {
            q: "Do you decide which vendors to use or what insurance they need?",
            a: "No. You make those decisions. We keep the records current.",
          },
          PRICING_FAQ,
        ],
      },
    ],
  },
  "Cleaning & Facility Services": {
    h1: "Outsourced administrative support for cleaning & facility services",
    metaTitle: "Admin Support for Cleaning & Facilities | Aurum Ventura",
    metaDescription: "Remote administrative support for cleaning and facility services: client invoices, service records, and performance reports.",
    heroSub: "Client invoices, service records, and performance reports, kept organized so your billing stays on time.",
    sections: [
      {
        heading: "Recurring contracts, recurring paperwork",
        paragraphs: [
          "Recurring service contracts create a steady stream of invoices, schedule changes, and client reports. Missed invoices and unlogged service changes are where cleaning and facility businesses lose money.",
        ],
      },
      {
        heading: "Example: a new recurring client",
        note: "Illustrative example, not a client case.",
        steps: [
          "A new recurring client is set up with its service records and invoice terms.",
          "Schedule changes are logged as they come in, so the records match the work.",
          "Invoices go out once you approve the amount and recipient.",
          "Each month, you get a performance summary for each client.",
        ],
      },
      {
        heading: "Who we work with",
        paragraphs: ["Owner-operated and growing businesses in:"],
        bullets: [
          "Commercial cleaning and janitorial companies",
          "Facility maintenance providers",
          "Landscaping and grounds crews with recurring contracts",
        ],
        after: "If invoicing and client reporting are slipping behind the crews, tell us on the contact page and we'll scope it.",
      },
      HOW_IT_WORKS,
      {
        heading: "Common questions",
        faq: [
          {
            q: "Who decides the invoice amounts?",
            a: "You do. We prepare and send invoices once you approve the amount and recipient.",
          },
          PRICING_FAQ,
        ],
      },
    ],
  },
  "Construction/Subcontractors": {
    h1: "Outsourced administrative support for construction & subcontractors",
    metaTitle: "Subcontractor Compliance & Admin Support | Aurum Ventura",
    metaDescription: "Remote administrative support for construction and subcontractor businesses: subcontractor files, insurance certificates, and job records.",
    heroSub: "Subcontractor paperwork, insurance certificates, and job records, kept current so you know who is cleared before the next payment.",
    sections: [
      {
        heading: "Compliance risk runs through every job",
        paragraphs: [
          "A general contractor carries the compliance risk for every subcontractor on the job. A missing W-9, an expired certificate of insurance, or an unfiled change order can hold up a payment or leave you exposed.",
        ],
      },
      {
        heading: "Example: a subcontractor joins a job",
        note: "Illustrative example, not a client case.",
        steps: [
          "A subcontractor is added to the job. We collect its W-9 and certificate of insurance and set up its file in ProWorx.",
          "We log each certificate's expiration date and flag it before it lapses.",
          "Change orders and job records are filed against the right project.",
          "Each week, you get a list of open items: missing, expiring, or unfiled documents.",
        ],
      },
      {
        heading: "Who we work with",
        paragraphs: ["Owner-operated and growing businesses in:"],
        bullets: [
          "General contractors and construction managers",
          "Subcontractors that need organized compliance records",
        ],
        after: "If subcontractor paperwork is holding up your jobs, tell us on the contact page and we'll scope it.",
      },
      HOW_IT_WORKS,
      {
        heading: "Common questions",
        faq: [
          {
            q: "Do you check that a certificate's coverage meets our contract?",
            a: "No. We track and file the certificates. Your team or your broker reviews coverage limits and endorsements.",
          },
          {
            q: "Do you work in ProWorx?",
            a: "Yes, we use ProWorx for project tracking.",
          },
          PRICING_FAQ,
        ],
      },
    ],
  },
  "Staffing & Recruiting": {
    h1: "Outsourced administrative support for staffing & recruiting firms",
    metaTitle: "Admin Support for Staffing & Recruiting | Aurum Ventura",
    metaDescription: "Remote administrative support for staffing and recruiting firms: candidate records, placement paperwork, and client reports.",
    heroSub: "Candidate records, placement paperwork, and client reports, kept current so your recruiters can focus on placements.",
    sections: [
      {
        heading: "Every placement creates paperwork",
        paragraphs: [
          "Each placement brings candidate records, offer documents, client contracts, and reports. When that work lags, recruiters spend evenings updating systems instead of filling roles.",
        ],
      },
      {
        heading: "Example: a placement, start to finish",
        note: "Illustrative example, not a client case.",
        steps: [
          "A new candidate is added, and their record is entered in your CRM.",
          "Placement documents are filed as offers are accepted.",
          "Client contracts are organized, with renewal dates logged.",
          "Each week, you get a report on open placements by client.",
        ],
      },
      {
        heading: "Who we work with",
        paragraphs: ["Owner-operated and growing businesses in:"],
        bullets: [
          "Staffing agencies and recruiting firms",
          "In-house recruiting teams with high placement volume",
        ],
        after: "If records and reports are slowing your recruiters down, tell us on the contact page and we'll scope it.",
      },
      HOW_IT_WORKS,
      {
        heading: "Common questions",
        faq: [
          {
            q: "Do you screen or evaluate candidates?",
            a: "No. We handle records and paperwork. Screening and hiring decisions stay with your team.",
          },
          {
            q: "Do you work in the systems we already use?",
            a: "Yes. We work in the CRM and spreadsheets you already have.",
          },
          PRICING_FAQ,
        ],
      },
    ],
  },
  "Real Estate": {
    h1: "Outsourced administrative support for real estate businesses",
    metaTitle: "Admin Support for Real Estate | Aurum Ventura",
    metaDescription: "Remote administrative support for real estate businesses: transaction paperwork, document files, and client records.",
    heroSub: "Transaction paperwork, document files, and client records, organized so every deal file is complete before closing.",
    sections: [
      {
        heading: "Every transaction creates a stack of paperwork",
        paragraphs: [
          "Each transaction brings forms, disclosures, and vendor records. A missing document can hold up a closing, and client records that aren't updated after the sale are hard to use for the next one.",
        ],
      },
      {
        heading: "Example: a transaction, start to finish",
        note: "Illustrative example, not a client case.",
        steps: [
          "A new transaction opens. We set up a deal file with a checklist of the required forms.",
          "Documents are filed as they come in, and missing items are flagged.",
          "Vendor records, such as inspectors and title contacts, are kept current.",
          "After closing, client records are updated in your CRM.",
        ],
      },
      {
        heading: "Who we work with",
        paragraphs: ["Owner-operated and growing businesses in:"],
        bullets: [
          "Independent brokers and small brokerages",
          "Investors and agents with a steady deal flow",
        ],
        after: "If deal files and client records are falling behind, tell us on the contact page and we'll scope it.",
      },
      HOW_IT_WORKS,
      {
        heading: "Common questions",
        faq: [
          {
            q: "Do you review contracts or give legal advice?",
            a: "No. We organize and track the paperwork. Your broker or attorney reviews the documents.",
          },
          PRICING_FAQ,
        ],
      },
    ],
  },
  "Professional Services": {
    h1: "Outsourced administrative support for professional services firms",
    metaTitle: "Admin Support for Professional Services | Aurum Ventura",
    metaDescription: "Remote administrative support for professional services firms: client records, engagement documents, and invoices.",
    heroSub: "Client records, engagement documents, and invoices, kept organized so your team bills on time and spends its hours on client work.",
    sections: [
      {
        heading: "Admin work that follows every engagement",
        paragraphs: [
          "Professional firms bill for their time, and the admin work behind it piles up: client records, engagement documents, invoices, and status updates. Late or unbilled invoices are the usual cost.",
        ],
      },
      {
        heading: "Example: a new client engagement",
        note: "Illustrative example, not a client case.",
        steps: [
          "A new engagement opens. We set up the client record and document folder.",
          "Engagement documents are filed as they come in.",
          "Invoices are prepared once you approve the amount and recipient.",
          "Each month, you get a status report on open engagements and invoices.",
        ],
      },
      {
        heading: "Who we work with",
        paragraphs: ["Owner-operated and growing businesses in:"],
        bullets: [
          "Consulting and advisory firms",
          "Small accounting and bookkeeping practices",
        ],
        after: "If billing and client records are slowing your team down, tell us on the contact page and we'll scope it.",
      },
      HOW_IT_WORKS,
      {
        heading: "Common questions",
        faq: [
          {
            q: "Do you do the professional work or give client advice?",
            a: "No. We handle the administrative work around your practice. Your professionals keep the client relationship and the advice.",
          },
          PRICING_FAQ,
        ],
      },
    ],
  },
};

export const INDUSTRY_SLUGS = AUDIENCE.map((industry) => industryToSlug(industry));

// Example labels are matched without regard to capitalization.
function serviceForExample(example) {
  const key = Object.keys(EXAMPLE_TO_SERVICE).find((k) => k.toLowerCase() === example.toLowerCase());
  return key ? EXAMPLE_TO_SERVICE[key] : undefined;
}

// Build reverse mapping: industry → service slugs
const INDUSTRY_SERVICES = {};
Object.entries(INDUSTRY_EXAMPLES).forEach(([industry, examples]) => {
  const serviceSlugs = new Set(examples.map(serviceForExample).filter(Boolean));
  INDUSTRY_SERVICES[industry] = Array.from(serviceSlugs);
});

// Build reverse mapping: service slug → industries
const SERVICE_INDUSTRIES = {};
SERVICES.forEach(service => {
  SERVICE_INDUSTRIES[service.slug] = Object.entries(INDUSTRY_SERVICES)
    .filter(([, slugs]) => slugs.includes(service.slug))
    .map(([industry]) => industry);
});

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;
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

export function adminIntakeDetailKey(id) { return `admin-intake:${id}`; }

function industryToSlug(industry) {
  return industry.toLowerCase().replace(/[&\s/]+/g, "-").replace(/-+/g, "-");
}

function slugToIndustry(slug) {
  const found = AUDIENCE.find(ind => industryToSlug(ind) === slug);
  return found || null;
}

export function pathFor(key) {
  if (typeof key === "string" && key.startsWith("product:")) return "/products/" + key.slice("product:".length);
  if (typeof key === "string" && key.startsWith("industry:")) return "/industries/" + key.slice("industry:".length);
  if (typeof key === "string" && key.startsWith("admin-intake:")) return "/admin/intakes/" + key.slice("admin-intake:".length);
  switch (key) {
    case "Home": return "/";
    case "Services": return "/services";
    case "Products": return "/products";
    case "ProgramsPartnerships": return "/programs-partnerships";
    case "ProWorx": return "https://www.proworx.io";
    case "PreferredPartners": return "/preferred-partners";
    case "BusinessPrograms": return "/programs-partnerships#business-programs";
    case "PartnershipOpportunities": return "/partnership-opportunities";
    case "About": return "/about";
    case "Industries": return "/industries";
    case "HowItWorks": return "/how-it-works";
    case "Security": return "/security";
    case "Privacy": return "/privacy";
    case "Terms": return "/terms";
    case "Contact": return "/contact";
    case "ROICalculator": return "/roi-calculator";
    case "FAQ": return "/faq";
    case "Alternatives": return "/alternatives";
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
  if (path === "/products") return "Products";
  if (path === "/programs-partnerships") return "ProgramsPartnerships";
  if (path === "/preferred-partners") return "PreferredPartners";
  if (path === "/partnership-opportunities") return "PartnershipOpportunities";
  if (path === "/about") return "About";
  if (path === "/industries") return "Industries";
  if (path === "/how-it-works") return "HowItWorks";
  if (path === "/security") return "Security";
  if (path === "/privacy") return "Privacy";
  if (path === "/terms") return "Terms";
  if (path === "/contact") return "Contact";
  if (path === "/roi-calculator") return "ROICalculator";
  if (path === "/faq") return "FAQ";
  if (path === "/alternatives") return "Alternatives";
  if (path === "/upload") return "Upload";
  if (path === "/client-intake") return "ClientIntake";
  if (path === "/admin" || path === "/admin/login") return "AdminLogin";
  if (path === "/admin/intakes") return "AdminIntakes";
  const adminIntakeMatch = path.match(/^\/admin\/intakes\/([^/]+)$/);
  if (adminIntakeMatch) return adminIntakeDetailKey(adminIntakeMatch[1]);
  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (productMatch && ALL_PRODUCTS.some((p) => p.slug === productMatch[1])) return "product:" + productMatch[1];
  // Old industry links were built as /services/industry:<slug>; send them to the industry page.
  const legacyIndustryMatch = path.match(/^\/services\/industry:([^/]+)$/);
  if (legacyIndustryMatch && slugToIndustry(legacyIndustryMatch[1])) return "industry:" + legacyIndustryMatch[1];
  const serviceMatch = path.match(/^\/services\/([^/]+)$/);
  if (serviceMatch && SERVICES.some((s) => s.slug === serviceMatch[1])) return serviceMatch[1];
  const industryMatch = path.match(/^\/industries\/([^/]+)$/);
  if (industryMatch && slugToIndustry(industryMatch[1])) return "industry:" + industryMatch[1];
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

const NAV_LABELS = { HowItWorks: "How It Works", ProgramsPartnerships: "Programs & Partnerships", Upload: "Upload Documents" };

const SERVICES_DROPDOWN_ITEMS = [
  { label: "All Services", key: "Services" },
  { label: "Document Preparation & Management", key: "document-preparation-management" },
  { label: "Invoice Administration", key: "invoice-administration" },
  { label: "License & Renewal Tracking", key: "license-renewal-tracking" },
  { label: "Vendor Administration", key: "vendor-administration" },
  { label: "CRM & Data Management", key: "crm-data-management" },
  { label: "Project Administration", key: "project-administration" },
  { label: "Forms & Paperwork", key: "forms-paperwork" },
  { label: "Data Entry & Reporting", key: "data-entry-reporting" },
  { label: "General Administrative Support", key: "general-administrative-support" },
  { label: "Business File Reset", key: "business-file-reset" },
  { label: "Back Office Set Up", key: "back-office-setup" },
];

const PROGRAMS_DROPDOWN_ITEMS = [
  { label: "Overview", key: "ProgramsPartnerships" },
  { label: "Preferred Partners", key: "PreferredPartners" },
  { label: "Business Programs", key: "BusinessPrograms" },
  { label: "Partnership Opportunities", key: "PartnershipOpportunities" },
];

function Nav({ page, setPage }) {
  const items = ["Home", "Services", "Products", "ProgramsPartnerships", "Industries", "About", "HowItWorks"];
  const [open, setOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [programsDropdownOpen, setProgramsDropdownOpen] = useState(false);
  const isServiceDetail = SERVICES.some((s) => s.slug === page);
  const isIndustryDetail = typeof page === "string" && page.startsWith("industry:");
  const isActive = (it) => page === it || (it === "Services" && isServiceDetail) || (it === "Industries" && isIndustryDetail);
  const go = (key, closeMenu) => (e) => {
    e.preventDefault();
    setPage(key);
    if (closeMenu) setOpen(false);
    setServicesDropdownOpen(false);
    setProgramsDropdownOpen(false);
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
          {items.map((it) => {
            if (it === "Services") {
              return (
                <div key={it} className="nav-dropdown" onMouseEnter={() => setServicesDropdownOpen(true)} onMouseLeave={() => setServicesDropdownOpen(false)}>
                  <a
                    className={"nav-link nav-dropdown-trigger" + (isActive(it) ? " active" : "") + (servicesDropdownOpen ? " open" : "")}
                    href={pathFor(it)}
                    onClick={go(it)}
                  >
                    {NAV_LABELS[it] || it}
                    <span className="nav-chevron">˅</span>
                  </a>
                  {servicesDropdownOpen && (
                    <div className="nav-dropdown-menu">
                      {SERVICES_DROPDOWN_ITEMS.map((item) => {
                        const url = pathFor(item.key);
                        const isExternal = url.startsWith("http");
                        return (
                          <a
                            key={item.key}
                            className="nav-dropdown-item"
                            href={url}
                            onClick={isExternal ? undefined : go(item.key, false)}
                            target={isExternal ? "_blank" : undefined}
                            rel={isExternal ? "noopener noreferrer" : undefined}
                          >
                            {item.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            if (it === "ProgramsPartnerships") {
              return (
                <div key={it} className="nav-dropdown" onMouseEnter={() => setProgramsDropdownOpen(true)} onMouseLeave={() => setProgramsDropdownOpen(false)}>
                  <a
                    className={"nav-link nav-dropdown-trigger" + (isActive(it) ? " active" : "") + (programsDropdownOpen ? " open" : "")}
                    href={pathFor(it)}
                    onClick={go(it)}
                  >
                    {NAV_LABELS[it] || it}
                    <span className="nav-chevron">˅</span>
                  </a>
                  {programsDropdownOpen && (
                    <div className="nav-dropdown-menu">
                      {PROGRAMS_DROPDOWN_ITEMS.map((item) => {
                        const url = pathFor(item.key);
                        const isExternal = url.startsWith("http");
                        return (
                          <a
                            key={item.key}
                            className="nav-dropdown-item"
                            href={url}
                            onClick={isExternal ? undefined : go(item.key, false)}
                            target={isExternal ? "_blank" : undefined}
                            rel={isExternal ? "noopener noreferrer" : undefined}
                          >
                            {item.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <a
                key={it}
                className={"nav-link" + (isActive(it) ? " active" : "")}
                href={pathFor(it)}
                onClick={go(it)}
              >
                {NAV_LABELS[it] || it}
              </a>
            );
          })}
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
          {items.map((it) => {
            if (it === "Services") {
              return (
                <div key={it}>
                  <button
                    className="nav-mobile-dropdown-trigger"
                    onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
                    aria-expanded={servicesDropdownOpen}
                    aria-controls="nav-mobile-services-dropdown"
                  >
                    <span className={"nav-mobile-link" + (isActive(it) ? " active" : "")}>{NAV_LABELS[it] || it}</span>
                    <span className={"nav-mobile-chevron" + (servicesDropdownOpen ? " open" : "")}>˅</span>
                  </button>
                  {servicesDropdownOpen && (
                    <div className="nav-mobile-dropdown" id="nav-mobile-services-dropdown">
                      {SERVICES_DROPDOWN_ITEMS.map((item) => {
                        const url = pathFor(item.key);
                        const isExternal = url.startsWith("http");
                        return (
                          <a
                            key={item.key}
                            className="nav-mobile-dropdown-item"
                            href={url}
                            onClick={isExternal ? undefined : go(item.key, true)}
                            target={isExternal ? "_blank" : undefined}
                            rel={isExternal ? "noopener noreferrer" : undefined}
                          >
                            {item.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            if (it === "ProgramsPartnerships") {
              return (
                <div key={it}>
                  <button
                    className="nav-mobile-dropdown-trigger"
                    onClick={() => setProgramsDropdownOpen(!programsDropdownOpen)}
                    aria-expanded={programsDropdownOpen}
                    aria-controls="nav-mobile-programs-dropdown"
                  >
                    <span className={"nav-mobile-link" + (isActive(it) ? " active" : "")}>{NAV_LABELS[it] || it}</span>
                    <span className={"nav-mobile-chevron" + (programsDropdownOpen ? " open" : "")}>˅</span>
                  </button>
                  {programsDropdownOpen && (
                    <div className="nav-mobile-dropdown" id="nav-mobile-programs-dropdown">
                      {PROGRAMS_DROPDOWN_ITEMS.map((item) => {
                        const url = pathFor(item.key);
                        const isExternal = url.startsWith("http");
                        return (
                          <a
                            key={item.key}
                            className="nav-mobile-dropdown-item"
                            href={url}
                            onClick={isExternal ? undefined : go(item.key, true)}
                            target={isExternal ? "_blank" : undefined}
                            rel={isExternal ? "noopener noreferrer" : undefined}
                          >
                            {item.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <a
                key={it}
                className={"nav-mobile-link" + (isActive(it) ? " active" : "")}
                href={pathFor(it)}
                onClick={go(it, true)}
              >
                {NAV_LABELS[it] || it}
              </a>
            );
          })}
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
            <a href={pathFor("Products")} onClick={go("Products")}>Products</a>
            <a href={pathFor("Industries")} onClick={go("Industries")}>Industries</a>
          </div>
          <div>
            <h3>How We Work</h3>
            <a href={pathFor("HowItWorks")} onClick={go("HowItWorks")}>How It Works</a>
            <a href={pathFor("FAQ")} onClick={go("FAQ")}>FAQ</a>
            <a href={pathFor("Alternatives")} onClick={go("Alternatives")}>Why Aurum?</a>
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
      <p className="footer-tagline">Human-Led. Technology-Supported.</p>
      <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginTop: "0.6rem", marginBottom: "0.8rem" }}>Powered by ProWorx</p>
      <Swoosh style={{ width: "140px", height: "46px", opacity: 0.5, margin: "0 auto" }} />
      <div className="footer-legal-bar">
        <p className="footer-legal">
          &copy; {new Date().getFullYear()} Aurum Ventura Enterprise LLC. Nashville-based remote administrative support for businesses nationwide.
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

function IndustryPanel({ setPage }) {
  const [active, setActive] = useState(0);
  const go = (slug) => (e) => { e.preventDefault(); setPage(slug); };
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
          {INDUSTRY_EXAMPLES[AUDIENCE[active]].map((ex) => {
            const slug = serviceForExample(ex);
            return slug ? (
              <li key={ex}>
                <a href={pathFor(slug)} onClick={go(slug)}>{ex}</a>
              </li>
            ) : (
              <li key={ex}>{ex}</li>
            );
          })}
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
      <p>Select what&rsquo;s eating your week — we&rsquo;ll show you what we can handle.</p>
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
      <a className="btn-primary" href={pathFor("Contact")} onClick={go}>See What We Can Take Off Your Plate &rarr;</a>
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

function PeopleProcessTechnology() {
  return (
    <section className="section alt">
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h2>People. Process. Technology.</h2>
        <p style={{ fontSize: "1.02rem", marginBottom: "1rem", maxWidth: "620px" }}>
          Strong back-office support takes more than completing tasks. Aurum Ventura combines human administrative
          support with organized workflows and structured processes designed to keep information, jobs, and day-to-day
          operations connected.
        </p>
        <p style={{ fontStyle: "italic", color: "#57677F", marginBottom: "1.5rem", maxWidth: "620px" }}>
          People handle the work. Process keeps it organized. Technology, when appropriate, helps scale the operation.
        </p>
        <p style={{ maxWidth: "620px", color: "#57677F" }}>
          Aurum Ventura is an independent administrative services company. We work alongside technology providers that complement
          our services. <strong>ProWorx</strong> is a technology partner that provides business management software for service
          businesses. <a href={pathFor("ProgramsPartnerships")} style={{ color: "#09748B", textDecoration: "underline" }}>Learn about our partnerships →</a>
        </p>
      </div>
    </section>
  );
}

function HomePage({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  const costRef = useReveal();
  const audienceRef = useReveal();
  const notRef = useReveal();
  return (
    <div>
      <section className="hero">
        <Swoosh style={{ position: "absolute", top: "8%", right: "-5%", width: "560px", height: "220px", opacity: 0.35, zIndex: 0 }} />
        <div className="hero-inner">
          <h1>Back Office.<br />Without the Hire.</h1>
          <p className="hero-sub" style={{ fontSize: "1.1rem", marginBottom: "1.2rem", maxWidth: "620px" }}>
            We design your workflows. We execute them. You get 10–16 hours/week back.
          </p>
          <p style={{ fontSize: "1.02rem", lineHeight: "1.7", color: COLORS.slate, marginBottom: "1.6rem", maxWidth: "620px" }}>
            <strong>What we handle:</strong><br />
            Document Prep • Invoicing • License Tracking • Vendor Admin • CRM • Project Admin • Data Reporting • Custom Workflows
          </p>
          <p style={{ fontSize: "0.9rem", fontWeight: "500", color: COLORS.teal, marginBottom: "1.6rem", maxWidth: "620px" }}>
            Based in Nashville, Tennessee. Remote service to businesses nationwide.
          </p>
          <div className="hero-cta">
            <a className="btn-text" href={pathFor("Services")} onClick={go("Services")}>See our services &rarr;</a>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 style={{ textAlign: "center" }}>How We Provide Administrative Support</h2>
        <p className="section-lead" style={{ textAlign: "center", margin: "0 auto 0.8rem" }}>
          Aurum Ventura delivers professional administrative support in two ways:
        </p>
        <div className="two-path-grid">
          <div className="two-path-card">
            <h3>Direct Business Support</h3>
            <p>
              Additional back-office capacity for growing businesses that need administrative and operational 
              support without immediately adding another full-time internal position.
            </p>
            <a className="btn-text" href={pathFor("Services")} onClick={go("Services")}>Explore Business Support &rarr;</a>
          </div>
          <div className="two-path-card">
            <h3>Programs & Partnerships</h3>
            <p>
              Hands-on operational implementation for entrepreneurship, workforce, economic development, and 
              small-business programs.
            </p>
            <a className="btn-text" href={pathFor("ProgramsPartnerships")} onClick={go("ProgramsPartnerships")}>Explore Partnerships &rarr;</a>
          </div>
        </div>
      </section>

      <section className="section alt">
        <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>The Real Cost of Administrative Work</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ background: "#E6F3F9", borderRadius: "12px", padding: "2rem", textAlign: "center", border: "1px solid #B8D4E8" }}>
            <p style={{ fontSize: "3.5rem", fontWeight: "700", color: COLORS.teal, margin: "0 0 0.5rem", fontFamily: "'Cormorant Garamond', serif" }}>10–16</p>
            <p style={{ fontSize: "0.85rem", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.navy, margin: "0 0 1rem" }}>Hours / Week</p>
            <p style={{ fontSize: "1.05rem", fontWeight: "600", color: COLORS.navy, margin: "0", lineHeight: "1.4" }}>consumed by running the business around the work</p>
          </div>

          <div style={{ background: "#FDE6E6", borderRadius: "12px", padding: "2rem", textAlign: "center", border: "1px solid #F5C5C5" }}>
            <p style={{ fontSize: "3.5rem", fontWeight: "700", color: "#D63D2E", margin: "0 0 0.5rem", fontFamily: "'Cormorant Garamond', serif" }}>$23K+</p>
            <p style={{ fontSize: "0.85rem", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: "#D63D2E", margin: "0 0 1rem" }}>Per Year</p>
            <p style={{ fontSize: "1.05rem", fontWeight: "600", color: COLORS.navy, margin: "0", lineHeight: "1.4" }}>in potential opportunity tied up in that time</p>
            <p style={{ fontSize: "0.8rem", color: COLORS.slate, marginTop: "0.8rem", fontStyle: "italic" }}>Potential opportunity value, not guaranteed lost revenue.</p>
          </div>

          <div style={{ background: "#FDE6E6", borderRadius: "12px", padding: "2rem", textAlign: "center", border: "1px solid #F5C5C5" }}>
            <p style={{ fontSize: "3.5rem", fontWeight: "700", color: "#D63D2E", margin: "0 0 0.5rem", fontFamily: "'Cormorant Garamond', serif" }}>1 in 3</p>
            <p style={{ fontSize: "0.85rem", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.navy, margin: "0 0 0.5rem" }}>New Employer Businesses</p>
            <p style={{ fontSize: "0.95rem", color: COLORS.slate, margin: "0 0 1rem" }}>do not make it to year three</p>
            <p style={{ fontSize: "0.8rem", fontWeight: "700", color: "#D63D2E", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.6rem" }}>The Stakes</p>
            <p style={{ fontSize: "1.1rem", fontWeight: "700", color: COLORS.navy, margin: "0", lineHeight: "1.3" }}>Small problems become business problems fast.</p>
          </div>
        </div>
      </section>

      <Testimonials />

      <section className="section alt">
        <h2 ref={audienceRef}>Who We Work With</h2>
        <p className="section-lead">
          Businesses with real administrative volume but no dedicated staff to own it — growing operations that 
          need consistency, not a full-time hire. Select an industry to see examples of what we handle.
        </p>
        <p style={{ fontSize: "0.9rem", backgroundColor: "#E6F3F9", border: "none", borderLeft: "3px solid #09748B", borderRadius: "4px", padding: "1rem 1.2rem", maxWidth: "500px", marginBottom: "1.3rem", color: "#041944" }}>
          <strong>Best fit:</strong> Aurum is a strong fit for growing businesses with recurring administrative
          volume, multiple customers or projects, and no dedicated team to consistently own the back office.
        </p>
        <IndustryPanel setPage={setPage} />
      </section>

      <section className="section">
        <h2>What We Handle</h2>
        <div className="plain-grid">
          {SERVICES.map((s, i) => (
            <a className="plain-grid-item" key={s.slug} href={pathFor(s.slug)} onClick={go(s.slug)}>
              <span className="plain-num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.title}</h3>
              {s.oneTime && <span className="badge-one-time">One-Time</span>}
            </a>
          ))}
        </div>
        <a className="btn-text" href={pathFor("Services")} onClick={go("Services")} style={{ marginTop: "0.8rem", display: "inline-block" }}>See the full list of services &rarr;</a>
      </section>

      <section className="section">
        <h2>Business operations, built better.</h2>
        <p className="section-lead">
          We provide the people, the process, and the technology: hands-on administrative support that grows with your business.
        </p>
      </section>

      <PeopleProcessTechnology />

      <section className="section alt">
        <h2 ref={notRef}>What We're Not</h2>
        <p className="section-lead">
          We're an administrative back office, not a virtual assistant marketplace, a law firm, or an accounting 
          firm. To keep that boundary clear, we don't provide:
        </p>
        <ul className="plain-list">
          {NOT_LIST.map((n) => <li key={n}>{n}</li>)}
        </ul>
        <a className="btn-text" href={pathFor("About")} onClick={go("About")} style={{ marginTop: "1rem", display: "block" }}>Learn how we work &rarr;</a>
      </section>

      <TimeSelector setPage={setPage} />
    </div>
  );
}

function Testimonials() {
  const ref = useReveal();
  return (
    <section className="section">
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
        <p className="kicker">Administrative Support Services</p>
        <h1>What We Do</h1>
        <p className="hero-sub">
          Our administrative support services fall into core categories — your custom service plan is built from
          the support areas you actually need — plus a one-time Business File Reset project if you just need
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
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>See How We Can Help</a>
      </section>
    </div>
  );
}

const PRODUCT_FAMILIES = [
  {
    title: "Growth Systems",
    summary: "Customer acquisition, prospecting, outreach, follow-up, and lead-support systems.",
    items: ["Automated Outreach", "Prospect Discovery", "Follow-Up Automation"],
  },
  {
    title: "Intelligence Systems",
    summary: "Prospect research, business intelligence, reporting, market information, and operational insight.",
    items: ["Prospect Intelligence", "Market Research", "Business Data", "Competitive Intelligence"],
  },
];

const PRODUCT_IMAGES = {
  "Automated Outreach": "/products/automated-outreach.webp",
  "Prospect Discovery": "/products/prospect-discovery.webp",
  "Follow-Up Automation": "/products/follow-up-automation.webp",
  "Market Research": "/products/market-research.webp",
  "Prospect Intelligence": "/products/prospect-intelligence.webp",
  "Business Data": "/products/business-data.webp",
  "Competitive Intelligence": "/products/competitive-intelligence.webp",
};

const PRODUCT_DETAILS = {
  "Automated Outreach": {
    description: "An automated prospecting system that identifies potential customers, organizes prospect information, prepares outreach, and manages follow-up workflows.",
    builtFor: "Small businesses that need consistent outbound prospecting without manually managing every step.",
    handles: "Prospect discovery \u2192 qualification \u2192 data organization \u2192 outreach \u2192 follow-up \u2192 reporting",
    receive: ["Automated workflow", "Prospect database", "Outreach sequences", "Follow-up automation", "Activity reporting"],
  },
  "Prospect Discovery": {
    description: "Find the right businesses to reach, with verified details and clear filters, so your outreach starts with prospects that fit.",
    builtFor: "Growing businesses that need a steady supply of qualified prospects without researching every lead by hand.",
    handles: "Targeted prospect research \u2192 verified business data \u2192 custom filters and segmentation \u2192 actionable lead lists",
    receive: ["Targeted prospect research", "Verified business data", "Custom filters and segmentation", "Actionable lead lists"],
  },
  "Follow-Up Automation": {
    description: "Keeps prospects engaged with automated email follow-ups, sent at the right time and tracked in one system.",
    builtFor: "Businesses that lose leads because follow-up is inconsistent or depends on someone remembering to send it.",
    handles: "Automated email sequences \u2192 follow-up scheduling \u2192 smart timing \u2192 tracking and optimization",
    receive: ["Automated email sequences", "Email follow-up sequences", "Smart scheduling", "Performance tracking"],
  },
  "Prospect Intelligence": {
    description: "Company, contact, and market insight that helps you understand the businesses you want to reach and the people who make the decisions.",
    builtFor: "Sales and business development teams that need deeper information on prospects before reaching out.",
    handles: "Company and contact insights \u2192 firmographic and technographic data \u2192 decision-maker identification \u2192 competitive intelligence",
    receive: ["Company and contact insights", "Firmographic and technographic data", "Decision-maker identification", "Real-time market and competitor insights"],
  },
  "Market Research": {
    description: "Industry, competitor, and audience research that shows where your market is heading and where the opportunities are.",
    builtFor: "Business owners planning a new offer, entering a new market, or deciding where to focus next.",
    handles: "Industry and competitor analysis \u2192 target audience insights \u2192 trend and opportunity research \u2192 custom research reports",
    receive: ["Industry and competitor analysis", "Target audience insights", "Trend and opportunity research", "Custom research reports"],
  },
  "Business Data": {
    description: "Verified business records, with filters for industry and location, so you can build lists you can act on.",
    builtFor: "Businesses building outreach, marketing, or sales lists that need accurate, current company information.",
    handles: "Verified business records \u2192 industry and location filters \u2192 contact information \u2192 custom data lists",
    receive: ["Verified business records", "Industry and location filters", "Contact information", "Custom data lists"],
  },
  "Competitive Intelligence": {
    description: "Tracks competitors, market positioning, and emerging threats and opportunities, reported in a form you can act on.",
    builtFor: "Business owners who want to know how they compare to competitors and what is changing in their market.",
    handles: "Competitor analysis \u2192 market positioning insights \u2192 threat and opportunity tracking \u2192 custom intelligence reports",
    receive: ["Competitor analysis", "Market positioning insights", "Threat and opportunity tracking", "Custom intelligence reports"],
  },
};

const productSlug = (name) => name.toLowerCase().replace(/ /g, "-");
export const ALL_PRODUCTS = PRODUCT_FAMILIES.flatMap((f) =>
  f.items.map((item) => ({ name: item, family: f.title, slug: productSlug(item) }))
);

function ProductDetailPage({ slug, setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  const product = ALL_PRODUCTS.find((p) => p.slug === slug);
  const details = PRODUCT_DETAILS[product.name];
  const image = PRODUCT_IMAGES[product.name];
  return (
    <div>
      <section className="section" style={{ paddingTop: "2.5rem" }}>
        <div className="shop-detail">
          {image && <img className="shop-detail-image" src={image} alt={`${product.name} product box`} />}
          <div>
            <a className="btn-text" href={pathFor("Products")} onClick={go("Products")} style={{ fontSize: "0.9rem" }}>&larr; All products</a>
            <p className="shop-family" style={{ marginTop: "1.2rem" }}>{product.family}</p>
            <h1>{product.name}</h1>
            {details ? (
              <>
                <p className="section-lead">{details.description}</p>
                <h3>Built for</h3>
                <p>{details.builtFor}</p>
                <h3>The system handles</h3>
                <p>{details.handles}</p>
                <h3>You receive</h3>
                <ul className="plain-list">
                  {details.receive.map((r) => <li key={r}>{r}</li>)}
                </ul>
                <h3>Common questions</h3>
                <div className="faq-item">
                  <p className="faq-q"><strong>How is pricing set?</strong></p>
                  <p className="industry-text">Each system is quoted from a custom scope of services, based on your business.</p>
                </div>
                <div className="faq-item">
                  <p className="faq-q"><strong>How do I get started?</strong></p>
                  <p className="industry-text">Request access, and we'll follow up by email to set up a short call.</p>
                </div>
              </>
            ) : (
              <p className="section-lead">Full details for this product are coming soon.</p>
            )}
            <div style={{ marginTop: "2rem" }}>
              <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Request Access</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductsPage({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  const allFamilies = PRODUCT_FAMILIES.filter((f) => f.items.length > 0).map((f) => f.title);
  const [selected, setSelected] = useState(allFamilies);
  const [sort, setSort] = useState("featured");
  const toggle = (name) => setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  const clearFilters = () => setSelected(allFamilies);
  const activeChips = allFamilies.filter((name) => selected.includes(name) && selected.length < allFamilies.length);
  let products = PRODUCT_FAMILIES
    .filter((f) => selected.includes(f.title))
    .flatMap((f) => f.items.map((item) => ({ item, family: f.title })));
  if (sort === "name") products = [...products].sort((a, b) => a.item.localeCompare(b.item));
  const initials = (name) => name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const [requestList, setRequestList] = useState([]);
  const [zoomed, setZoomed] = useState(null);
  useEffect(() => {
    if (!zoomed) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setZoomed(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);
  const toggleRequest = (name) => setRequestList((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  const sendRequest = () => setPage("Contact", "?products=" + encodeURIComponent(requestList.join(", ")));
  return (
    <div>
      <section className="page-head">
        <p className="kicker">Aurum Ventura Systems</p>
        <h1>Business Systems Built to Work for You</h1>
        <p className="hero-sub">
          Automated tools and systems designed to help growing businesses find opportunities, streamline repetitive
          work, and operate more efficiently.
        </p>
      </section>
      <section className="section" style={{ paddingTop: "2rem" }}>
        <div className="shop-layout">
          <aside className="shop-sidebar">
            <h3 style={{ fontSize: "1.1rem" }}>Product Family</h3>
            {PRODUCT_FAMILIES.map((f) => {
              const empty = f.items.length === 0;
              return (
                <label key={f.title} className="shop-filter">
                  <input
                    type="checkbox"
                    checked={selected.includes(f.title)}
                    disabled={empty}
                    onChange={() => toggle(f.title)}
                  />
                  <span style={{ opacity: empty ? 0.5 : 1 }}>{f.title}</span>
                  <span className="shop-count">{f.items.length}</span>
                </label>
              );
            })}
          </aside>
          <div>
            <div className="shop-toolbar">
              <div>
                <p className="shop-count-line">{products.length} {products.length === 1 ? "product" : "products"} found</p>
                {activeChips.length > 0 && (
                  <div className="shop-chips">
                    <span style={{ fontSize: "0.85rem", color: COLORS.slate }}>Filters:</span>
                    {activeChips.map((name) => (
                      <button key={name} type="button" className="shop-chip" onClick={() => toggle(name)} aria-label={`Remove ${name} filter`}>
                        {name} &times;
                      </button>
                    ))}
                    <button type="button" className="shop-clear" onClick={clearFilters}>Clear Filters</button>
                  </div>
                )}
              </div>
              <select className="shop-select" aria-label="Sort products" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="name">Name, A&ndash;Z</option>
              </select>
            </div>
            {products.length > 0 ? (
              <div className="shop-grid">
                {products.map(({ item, family }) => (
                  <div className="shop-card" key={item}>
                    {PRODUCT_IMAGES[item] ? (
                      <button type="button" className="shop-image-button" onClick={() => setZoomed(item)} aria-label={`View larger image of ${item}`}>
                        <img className="shop-image shop-image-photo" src={PRODUCT_IMAGES[item]} alt={`${item} product box`} loading="lazy" />
                      </button>
                    ) : (
                      <div className="shop-image" aria-hidden="true">{initials(item)}</div>
                    )}
                    <p className="shop-family">{family}</p>
                    <h3 className="shop-name">
                      <a className="shop-name-link" href={pathFor("product:" + productSlug(item))} onClick={go("product:" + productSlug(item))}>{item}<span className="shop-name-arrow" aria-hidden="true"> &rarr;</span></a>
                    </h3>
                    <span className="shop-soon">Coming soon</span>
                    <button
                      type="button"
                      className="shop-add"
                      aria-pressed={requestList.includes(item)}
                      onClick={() => toggleRequest(item)}
                    >
                      {requestList.includes(item) ? "Remove from list" : "Add to request list"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontStyle: "italic", color: COLORS.slate }}>Catalog coming soon.</p>
            )}
          </div>
        </div>
      </section>
      {zoomed && PRODUCT_IMAGES[zoomed] && (
        <div className="shop-zoom-overlay" role="dialog" aria-modal="true" aria-label={`${zoomed} product box`} onClick={() => setZoomed(null)}>
          <button type="button" className="shop-zoom-close" onClick={() => setZoomed(null)} aria-label="Close larger image">&times;</button>
          <img src={PRODUCT_IMAGES[zoomed]} alt={`${zoomed} product box`} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      {requestList.length > 0 && (
        <div className="shop-requestbar" role="region" aria-label="Request list">
          <span>{requestList.length} in your request list</span>
          <div className="shop-requestbar-actions">
            <button type="button" className="shop-requestbar-clear" onClick={() => setRequestList([])}>Clear</button>
            <button type="button" className="btn-primary" onClick={sendRequest}>Send request</button>
          </div>
        </div>
      )}
      <section className="section alt">
        <h2>Need someone to operate it for you?</h2>
        <p className="section-lead">
          Our team can help implement and manage the systems alongside your existing operations.
        </p>
        <a className="btn-text" href={pathFor("Services")} onClick={go("Services")}>Explore Our Services &rarr;</a>
      </section>
      <section className="cta-band">
        <h2>Tell us where your business is getting bogged down.</h2>
        <p>We&rsquo;ll help you build the system around it.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Request Access</a>
        <a className="btn-text" href={pathFor("HowItWorks")} onClick={go("HowItWorks")} style={{ marginLeft: "1.2rem" }}>Learn More &rarr;</a>
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
      <section className="breadcrumb-section" style={{ padding: "0.8rem 1.5rem", borderBottom: "1px solid #E4E9EF", fontSize: "0.85rem" }}>
        <a href={pathFor("Home")} onClick={go("Home")} style={{ color: "#09748B", textDecoration: "none" }}>Home</a>
        <span style={{ margin: "0 0.5rem", color: "#57677F" }}>/</span>
        <a href={pathFor("Services")} onClick={go("Services")} style={{ color: "#09748B", textDecoration: "none" }}>Services</a>
        <span style={{ margin: "0 0.5rem", color: "#57677F" }}>/</span>
        <span style={{ color: "#57677F" }}>{service.title}</span>
      </section>
      <section className="page-head">
        <a className="btn-text back-link" href={pathFor("Services")} onClick={go("Services")}>&larr; All Services</a>
        <p className="kicker">{String(index + 1).padStart(2, "0")} &middot; Services</p>
        <h1>{service.title}{service.oneTime && <span className="badge-one-time badge-one-time-h1">One-Time Project</span>}</h1>
        <p className="hero-sub">{service.summary}</p>
      </section>
      {service.intro && (
        <section className="section">
          <h2>About This Service</h2>
          {service.intro.map((p) => <p className="industry-text" key={p}>{p}</p>)}
        </section>
      )}
      <section className="section">
        <h2>Examples of This Work</h2>
        <ul className="plain-list">
          {service.examples.map((ex) => <li key={ex}>{ex}</li>)}
        </ul>
      </section>
      <section className="section alt">
        <h2>{HOW_IT_WORKS.heading}</h2>
        <ol className="industry-list">
          {HOW_IT_WORKS.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>
      {service.faq && (
        <section className="section">
          <h2>Common Questions</h2>
          {service.faq.map((item) => (
            <div className="faq-item" key={item.q}>
              <p className="faq-q"><strong>{item.q}</strong></p>
              <p className="industry-text">{item.a}</p>
            </div>
          ))}
        </section>
      )}
      {SERVICE_INDUSTRIES[slug] && SERVICE_INDUSTRIES[slug].length > 0 && (
        <section className="section alt">
          <h2>Used by These Industries</h2>
          <p className="section-lead">
            This service is commonly used by businesses in these industries.
          </p>
          <div className="tag-list">
            {SERVICE_INDUSTRIES[slug].map((industry) => (
              <a
                key={industry}
                href={`/industries/${industryToSlug(industry)}`}
                onClick={(e) => { e.preventDefault(); setPage("industry:" + industryToSlug(industry)); }}
                className="tag"
                style={{ cursor: "pointer", textDecoration: "none" }}
              >
                {industry}
              </a>
            ))}
          </div>
        </section>
      )}
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
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Get a Custom Quote</a>
      </section>
    </div>
  );
}

function IndustryDetailPage({ slug, setPage }) {
  const industry = slugToIndustry(slug);
  if (!industry) return null;

  const services = INDUSTRY_SERVICES[industry] || [];
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };

  return (
    <div>
      <section className="breadcrumb-section" style={{ padding: "0.8rem 1.5rem", borderBottom: "1px solid #E4E9EF", fontSize: "0.85rem" }}>
        <a href={pathFor("Home")} onClick={go("Home")} style={{ color: "#09748B", textDecoration: "none" }}>Home</a>
        <span style={{ margin: "0 0.5rem", color: "#57677F" }}>/</span>
        <a href={pathFor("Industries")} onClick={go("Industries")} style={{ color: "#09748B", textDecoration: "none" }}>Industries</a>
        <span style={{ margin: "0 0.5rem", color: "#57677F" }}>/</span>
        <span style={{ color: "#57677F" }}>{industry}</span>
      </section>
      <section className="page-head">
        <a className="btn-text back-link" href={pathFor("Industries")} onClick={go("Industries")}>&larr; All Industries</a>
        <p className="kicker">Industries We Serve</p>
        <h1>{INDUSTRY_PAGE_COPY[industry] ? INDUSTRY_PAGE_COPY[industry].h1 : industry}</h1>
        <p className="hero-sub">
          {INDUSTRY_PAGE_COPY[industry] ? INDUSTRY_PAGE_COPY[industry].heroSub : `${industry} businesses often juggle customer or project workflows while administrative tasks pile up. We handle the back-office work so you can focus on serving clients and growing.`}
        </p>
      </section>

      {services.length > 0 && (
        <section className="section">
          <h2>Services We Provide for {industry}</h2>
          <p className="section-lead">
            Businesses in {industry.toLowerCase()} commonly use these services:
          </p>
          <div className="service-links">
            {services.map((serviceSlug) => {
              const service = SERVICES.find(s => s.slug === serviceSlug);
              return service ? (
                <a
                  key={serviceSlug}
                  href={pathFor(serviceSlug)}
                  onClick={go(serviceSlug)}
                  className="service-link-item"
                  style={{ display: "block", padding: "1rem", marginBottom: "1rem", border: "1px solid #ddd", borderRadius: "0.5rem", textDecoration: "none", color: "inherit" }}
                >
                  <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>{service.title}</h3>
                  <p style={{ margin: 0, color: COLORS.slate, fontSize: "0.95rem" }}>{service.summary}</p>
                </a>
              ) : null;
            })}
          </div>
        </section>
      )}

      {INDUSTRY_PAGE_COPY[industry] && INDUSTRY_PAGE_COPY[industry].sections.map((section) => (
        <section className="section industry-section" key={section.heading}>
          <h2>{section.heading}</h2>
          {section.note && <p className="section-lead"><em>{section.note}</em></p>}
          {(section.paragraphs || []).map((p) => <p className="industry-text" key={p}>{p}</p>)}
          {section.steps && <ol className="industry-list">{section.steps.map((s) => <li key={s}>{s}</li>)}</ol>}
          {section.bullets && <ul className="industry-list">{section.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
          {section.after && <p className="industry-text">{section.after}</p>}
          {(section.faq || []).map((item) => (
            <div className="faq-item" key={item.q}>
              <p className="faq-q"><strong>{item.q}</strong></p>
              <p className="industry-text">{item.a}</p>
            </div>
          ))}
        </section>
      ))}

      <section className="cta-band">
        <h2>Ready to handle {industry.toLowerCase()} operations more efficiently?</h2>
        <p>We'll build a custom scope of services around your specific needs.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Get Started for {industry}</a>
      </section>
    </div>
  );
}

function ProgramsPartnershipsPage({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  const ref1 = useReveal();
  const ref2 = useReveal();
  const ref3 = useReveal();
  const ref4 = useReveal();

  const PARTNER_TYPES = [
    "Economic Development Organizations",
    "Workforce Development Programs",
    "Entrepreneurship Programs",
    "Startup Incubators & Accelerators",
    "Chambers & Business Organizations",
    "Colleges & Universities",
    "Community & Nonprofit Programs",
    "Corporate Small-Business Initiatives",
  ];

  const IMPLEMENTATION_SYSTEMS = [
    "Client intake workflows",
    "CRM structure and setup",
    "Digital Document Organization",
    "Administrative workflows",
    "Invoice administration workflows",
    "Vendor tracking and administration",
    "Project tracking systems",
    "License and renewal tracking",
    "Forms and paperwork systems",
    "Internal administrative SOPs",
    "Data tracking and reporting",
    "Business file organization",
    "General back-office operational structure",
  ];

  const PROCESS_STEPS = [
    ["Assess", "Review the participant's current operational structure and identify gaps."],
    ["Build", "Create the appropriate administrative systems and workflows."],
    ["Implement", "Help put those systems into active use within the business."],
    ["Train", "Show the business owner or team how to maintain and use the systems."],
    ["Support", "Provide limited post-implementation support where appropriate."],
  ];

  return (
    <div>
      <section className="hero">
        <Swoosh style={{ position: "absolute", top: "8%", right: "-5%", width: "560px", height: "220px", opacity: 0.35, zIndex: 0 }} />
        <div className="hero-inner">
          <p className="kicker">Programs & Partnerships</p>
          <h1>From Business Education<br />to Business Implementation.</h1>
          <p className="hero-sub">
            Aurum Ventura partners with organizations that support entrepreneurs and growing businesses by providing hands-on operational and back-office implementation. While your programs provide education, coaching, and resources, Aurum Ventura helps participants actually implement the systems needed to run their businesses.
          </p>
          <div className="hero-cta">
            <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Explore an Implementation Partnership</a>
            <a className="btn-text" href="#pilot-section" style={{ marginLeft: "1rem" }}>Discuss a Pilot Program &rarr;</a>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 ref={ref1}>An Implementation Layer for Business Support Programs</h2>
        <p className="section-lead">
          Entrepreneurship and business development programs provide tremendous value — education, coaching, resources, funding access, and business development support. But participant businesses often still struggle with one critical piece: actually building the operational systems needed to run consistently.
        </p>
        <p>
          Many business owners know what they need to do. They've learned it in a program, from a mentor, from a workshop. But implementing administrative systems, setting up workflows, organizing documents, and building operational infrastructure takes time, expertise, and dedicated effort.
        </p>
        <p>
          That's the gap Aurum Ventura fills. We work alongside your programs, not against them. Your organization provides the education and guidance. Aurum Ventura provides the implementation expertise and hands-on work to help participants turn that guidance into working systems.
        </p>
      </section>

      <section className="section alt">
        <h2 ref={ref2}>Who We Partner With</h2>
        <p className="section-lead">
          Aurum Ventura works with organizations of all types that support entrepreneurs and growing businesses.
        </p>
        <div className="partner-grid">
          {PARTNER_TYPES.map((type) => (
            <div className="partner-card" key={type}>
              <h3>{type}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 ref={ref3}>What We Help Implement</h2>
        <p className="section-lead">
          Every participant's needs are different. Here are the systems and structures Aurum Ventura can help implement:
        </p>
        <div className="systems-grid">
          {IMPLEMENTATION_SYSTEMS.map((system) => (
            <div className="system-item" key={system}>
              <span className="system-bullet">•</span>
              <span>{system}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section alt">
        <h2 ref={ref4}>Our Implementation Process</h2>
        <p className="section-lead">
          Every implementation partnership follows the same structured approach, adapted to your program's needs and participant's situation:
        </p>
        <div className="process-steps">
          {PROCESS_STEPS.map(([step, description], index) => (
            <div className="process-step" key={step}>
              <div className="step-number">{String(index + 1).padStart(2, "0")}</div>
              <div className="step-content">
                <h3>{step}</h3>
                <p>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="pilot-section">
        <h2>Start With a Pilot</h2>
        <p className="section-lead">
          Not sure if an implementation partnership is the right fit? Start small.
        </p>
        <div className="pilot-box">
          <p>
            Aurum Ventura can work with a defined pilot cohort of entrepreneurs or businesses within your program. We implement operational systems with that group, document the outcomes, and evaluate the effectiveness of the model before expanding into a larger or recurring program.
          </p>
          <p>
            A pilot lets you assess whether implementation partnerships create value for your participants without committing to a full program launch.
          </p>
        </div>
      </section>

      <section className="section alt">
        <h2>Custom Program Partnerships</h2>
        <p className="section-lead">
          Every partnership is custom, based on your program size, scope, participant needs, and implementation requirements.
        </p>
        <div className="custom-note">
          <p>
            We don't offer fixed program pricing. Instead, we work with you to understand your program's goals and structure a partnership that makes sense for your organization and the entrepreneurs you serve.
          </p>
          <p>
            The right program model depends on cohort size, implementation scope, ongoing support needs, and your organization's capacity — and we build a partnership around those real factors, not a generic pricing tier.
          </p>
        </div>
      </section>

      <section className="section">
        <h2>Technology Partners</h2>
        <p className="section-lead">
          Aurum Ventura is an independent administrative services company. We work alongside technology providers that complement the services we provide.
        </p>
        <div style={{ maxWidth: "620px", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "#041944" }}>ProWorx</h3>
          <p style={{ color: "#57677F", marginBottom: "0.8rem" }}>
            ProWorx provides business management software designed for service businesses. When appropriate for a client's operations,
            working with ProWorx as a technology platform can help organize service delivery, scheduling, client data, and operational visibility.
          </p>
          <p style={{ color: "#57677F" }}>
            Aurum Ventura handles the administrative work. ProWorx handles the business management technology. Together, they support a more
            complete operational backbone.
          </p>
        </div>
        <a className="btn-text" href="https://www.proworx.io/" target="_blank" rel="noopener noreferrer nofollow">
          Learn about ProWorx →
        </a>
      </section>

      <section className="cta-band">
        <h2>Add an Implementation Layer to Your Program.</h2>
        <p>If your organization already supports entrepreneurs or growing businesses, Aurum Ventura can help participants turn operational guidance into working systems.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Discuss a Program Partnership</a>
      </section>
    </div>
  );
}

function PreferredPartnersPage({ setPage }) {
  const [partnershipOpen, setPartnershipOpen] = useState(false);
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };

  return (
    <div>
      <section className="page-head">
        <p className="kicker">Preferred Partnerships</p>
        <h1>Our Networking Ecosystem</h1>
        <p className="hero-sub">
          Explore businesses within the Aurum Ventura network and learn more about the companies we partner with.
        </p>
      </section>

      <section className="section">
        <div className="partner-profile">
          <img src="/proworx-logo.png" alt="ProWorx" className="partner-profile-logo" />
          <h2>ProWorx</h2>

          <div className="partner-meta">
            <p className="partner-type">Technology & Business Solutions Partner</p>
          </div>

          <p className="partner-description">
            ProWorx is an independent technology and business solutions company that Aurum Ventura has partnered with as part of its growing business network.
          </p>

          <div className="partner-profile-links">
            <a href="https://www.proworx.io" target="_blank" rel="noopener noreferrer nofollow" className="btn-primary">
              Learn More About ProWorx →
            </a>
            <button
              onClick={() => setPartnershipOpen(!partnershipOpen)}
              className="btn-secondary"
              style={{ cursor: "pointer", width: "100%" }}
            >
              Learn More About the Partnership {partnershipOpen ? "−" : "→"}
            </button>
          </div>

        </div>

        {partnershipOpen && (
          <div className="partnership-dropdown" style={{ marginTop: "2rem" }}>
            <h3 style={{ textAlign: "center", fontSize: "1.15rem", color: COLORS.navy, marginBottom: "1rem" }}>About the Aurum Ventura & ProWorx Partnership</h3>
            <p style={{ maxWidth: "620px", margin: "0 auto 1.5rem", textAlign: "center", color: COLORS.slate }}>
              Aurum Ventura and ProWorx have partnered to provide complementary services that strengthen operational support for growing businesses.
            </p>

            <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
              <h4 style={{ fontSize: "1.05rem", marginBottom: "0.6rem", color: COLORS.navy }}>What This Partnership Means</h4>
              <p style={{ marginBottom: "1rem", color: COLORS.slate }}>
                Aurum Ventura focuses on the human side of business operations—administrative support, process optimization, and strategic organization. ProWorx provides the technology platform that helps manage those operations efficiently. Together, they create a complete solution for businesses looking to streamline their back-office functions.
              </p>

              <h4 style={{ fontSize: "1.05rem", marginBottom: "0.6rem", color: COLORS.navy }}>How It Works</h4>
              <ul className="plain-list" style={{ marginTop: "0.8rem", textAlign: "left", display: "inline-block" }}>
                <li>Aurum Ventura handles the administrative and operational tasks that keep a business running smoothly.</li>
                <li>ProWorx provides the business management software and technology infrastructure to organize and track those operations.</li>
                <li>When appropriate for a client's needs, the two services work together to provide integrated, end-to-end operational support.</li>
              </ul>

              <h4 style={{ fontSize: "1.05rem", marginBottom: "0.6rem", marginTop: "1.2rem", color: COLORS.navy }}>Two Separate Companies, Aligned Mission</h4>
              <p style={{ marginBottom: "1rem", color: COLORS.slate }}>
                Aurum Ventura and ProWorx are independent companies with distinct services. The partnership reflects a shared commitment to helping businesses operate more efficiently and scale sustainably. Clients can work with either company independently, or leverage both services together for more comprehensive support.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="section alt">
        <h2>About Aurum Ventura</h2>
        <p className="section-lead" style={{ maxWidth: "620px" }}>
          Aurum Ventura Enterprise provides administrative and operational support for businesses while building a broader network of professional relationships and business resources.
        </p>
        <a className="btn-text" href={pathFor("About")} onClick={go("About")}>
          Learn More About Aurum Ventura →
        </a>
      </section>
    </div>
  );
}

function PartnershipOpportunitiesPage({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  return (
    <div>
      <section className="page-head">
        <p className="kicker">Partnerships</p>
        <h1>Partnership Opportunities</h1>
        <p className="hero-sub">
          Aurum Ventura is actively building partnerships with organizations and professionals who share our commitment to supporting business growth and operational excellence.
        </p>
      </section>
      <section className="section">
        <h2>How Organizations Can Partner With Us</h2>
        <p className="section-lead">
          If your organization provides business support, education, coaching, or resources to entrepreneurs and growing businesses, Aurum Ventura can extend your impact by providing hands-on operational implementation for the businesses and participants in your program.
        </p>
      </section>
      <section className="section alt">
        <h2>What We Offer Partners</h2>
        <ul className="plain-list">
          <li>Direct operational support for program participants or clients</li>
          <li>Custom implementation packages tailored to your program's scope</li>
          <li>Professional administrative systems and workflow setup</li>
          <li>Documented outcomes and program effectiveness reporting</li>
          <li>Flexible partnership models, from pilot programs to ongoing arrangements</li>
        </ul>
      </section>
      <section className="section">
        <h2>Types of Partnerships</h2>
        <p style={{ marginBottom: "1.5rem" }}>
          <strong>Program Partnerships:</strong> Work with your organization to implement back-office systems for entrepreneurs and growing businesses in your program.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          <strong>Referral Partnerships:</strong> Refer businesses to Aurum Ventura for administrative support, building a valuable resource for your network.
        </p>
        <p>
          <strong>Collaborative Partnerships:</strong> Work together on specific initiatives, pilot programs, or custom projects aligned with both organizations' missions.
        </p>
      </section>
      <section className="cta-band">
        <h2>Ready to Explore Partnership?</h2>
        <p>If your organization supports entrepreneurs or growing businesses, let's talk about how we can work together.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Discuss a Partnership</a>
      </section>
    </div>
  );
}

function AboutPage({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  return (
    <div>
      <section className="page-head">
        <p className="kicker">About</p>
        <h1>About Aurum Ventura Enterprise LLC</h1>
        <p className="hero-sub">
          Nashville-Based Outsourced Administrative Back Office
        </p>
      </section>

      <section className="section">
        <h2>Our Mission</h2>
        <div className="mission-statement">
          <p>
            Our mission is to help small and growing businesses operate more efficiently by reducing administrative burden, eliminating unnecessary labor hours, and creating organized digital systems that support long-term growth.
          </p>
          <p>
            We combine modern technology with human oversight to deliver dependable, precise, and practical back-office support — giving business owners and teams more time to focus on operating, serving customers, and moving their businesses forward.
          </p>
        </div>
      </section>

      <section className="section alt">
        <h2>People. Process. Technology.</h2>
        <p className="section-lead">
          The core idea behind Aurum Ventura is simple: People + Process + Technology.
        </p>
        <p style={{ marginBottom: "1.2rem" }}>
          Our team provides the people and operational expertise that handle the work. Process expertise connects that
          work into organized, repeatable workflows. Technology, where it fits, scales the operation and reduces repetitive effort.
        </p>
        <p style={{ fontStyle: "italic", color: "#57677F" }}>
          Tell us where your business is getting bogged down. We&rsquo;ll help you build the system around it.
        </p>
      </section>

      <section className="section alt">
        <h2>Why Aurum Ventura Was Built</h2>
        <p className="section-lead">
          There's a common challenge that affects both individual businesses and the organizations supporting them: the gap between knowing what needs to be done and having the capacity to actually implement it.
        </p>
        <p style={{ marginBottom: "1.2rem" }}>
          Businesses often account for payroll, materials, equipment, marketing, and other obvious operating expenses. But administrative time is different — hours spent searching for documents, organizing files, updating spreadsheets, processing routine paperwork, tracking expiration dates, handling invoices, and maintaining records are frequently spread across owners, managers, supervisors, and employees without the true cost ever being measured.
        </p>
        <p style={{ marginBottom: "1.2rem" }}>
          Aurum Ventura was built to help close that implementation gap. We provide outsourced back-office administrative support to small and growing businesses nationwide, operating remotely to deliver consistent, reliable support regardless of business location. Whether it's Document Organization, Invoice Administration, Vendor Records, CRM updates, License Tracking, or Project Administration, Aurum Ventura handles the operational work that allows business owners to focus on growth.
        </p>
        <p style={{ marginBottom: "1.2rem" }}>
          We help businesses and programs move away from outdated, paper-heavy processes by creating more organized digital workflows that make important information easier to locate, manage, and maintain. Instead of paperwork sitting in filing cabinets, vehicles, desks, inboxes, or scattered folders, we help develop more structured administrative environments. The goal is not simply to digitize paperwork. It is to help businesses create better systems around the administrative work they already have.
        </p>
      </section>

      <section className="section alt">
        <h2>Nashville-Based. Nationwide Service.</h2>
        <p className="section-lead">
          Aurum Ventura Enterprise LLC is headquartered in Nashville, Tennessee. Because our administrative services operate through a remote business model, we support businesses throughout the United States without requiring a physical office location in your city.
        </p>
        <div className="trust-facts" style={{ marginBottom: "1.2rem" }}>
          <span>Nashville, TN — headquartered</span>
          <span>Nationwide — remote service model</span>
          <span>Tennessee-registered LLC</span>
          <span>Business insurance maintained</span>
        </div>
        <p style={{ marginBottom: "1.2rem" }}>
          We believe businesses should feel confident not only in the services they receive, but also in the company they choose to trust with their administrative operations. Our goal is to build long-term working relationships based on organization, consistency, professionalism, confidentiality, and accountability.
        </p>
      </section>

      <section className="section alt">
        <h2>Human-Led. Technology-Supported.</h2>
        <p className="section-lead">
          We operate in an era where artificial intelligence and automation can make business operations faster and more efficient. At Aurum Ventura, we embrace those tools — but we do not believe technology should replace human judgment.
        </p>
        <p style={{ marginBottom: "1.2rem" }}>
          Administrative work often involves context, attention to detail, communication, exceptions, and decisions that cannot always be reduced to an automated process. Technology can misunderstand information, overlook context, or produce incorrect results.
        </p>
        <p style={{ marginBottom: "1.2rem" }}>
          That is why our approach remains human-led and technology-supported. We use modern digital tools, automation, and artificial intelligence to reduce repetitive work, improve organization, support administrative workflows, and help routine processes move more efficiently.
        </p>
        <p style={{ marginBottom: "1.2rem" }}>
          However, our clients' administrative needs remain under human oversight. Documents are reviewed. Questions are evaluated in context. Exceptions are handled individually. Administrative responsibilities are approached with actual thought and attention rather than relying entirely on an automated system to make every decision.
        </p>
        <p style={{ marginBottom: "1.2rem" }}>
          Our goal is not to remove people from business administration. It is to give people better tools to manage it. For our clients, that means the efficiency of modern technology combined with the accountability, judgment, and attention of real people working behind the scenes.
        </p>
      </section>

      <section className="section">
        <h2>Our Approach to Confidentiality</h2>
        <p className="section-lead">
          Our clients trust us with information that is important to their businesses, and we treat that responsibility seriously. Aurum Ventura follows a need-to-access approach to client information.
        </p>
        <p className="section-lead">
          Business records and documents should only be accessed when they are necessary to complete an authorized administrative task.
        </p>
        <div className="principle-grid">
          {CONFIDENTIALITY_PRINCIPLES.map(([label, text], i) => (
            <div className="principle-item" key={label}>
              <span className="principle-num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{label}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
        <p>
          Confidentiality is not treated as an additional service. It is part of how we operate.
        </p>
      </section>

      <section className="section alt">
        <h2>Your Business. Our Back Office.</h2>
        <p className="section-lead">
          Aurum Ventura exists to help business owners and teams spend less time managing administrative work and more time operating, serving customers, and growing their businesses. We provide the structure behind the scenes so your business can continue moving forward.
        </p>
        <p>
          Human-led. Technology-supported. Built for better business operations.
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
        <a className="btn-primary" href={pathFor("Contact")} onClick={(e) => { e.preventDefault(); setPage("Contact"); }}>Get Your Quote</a>
      </section>
    </div>
  );
}

function IndustriesPage({ setPage }) {
  const ref = useReveal();
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  return (
    <div>
      <section className="page-head">
        <p className="kicker">Industries</p>
        <h1>Who We Work With</h1>
        <p className="hero-sub">
          Businesses with real administrative volume but no dedicated staff to own it — growing
          operations that need consistency, not a full-time hire. We work with industries nationwide.
        </p>
      </section>
      <section className="section">
        <h2 ref={ref}>Industries We Serve</h2>
        <div className="tag-list">
          {AUDIENCE.map((industry) => (
            <a
              key={industry}
              href={`/industries/${industryToSlug(industry)}`}
              onClick={go("industry:" + industryToSlug(industry))}
              className="tag"
              style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}
            >
              {industry}
            </a>
          ))}
        </div>
      </section>
      <section className="cta-band">
        <h2>Don't see your industry?</h2>
        <p>We work with a range of service and operational businesses beyond this list — tell us what you do.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Request a Consultation</a>
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

const FUNNEL_STEPS = ["Areas", "Your business", "Priorities"];
const INTEREST_OPTIONS = SERVICES.map((s) => s.title);

function ContactPage() {
  const [form, setForm] = useState({ name: "", business: "", email: "", phone: "", type: "", message: "" });
  const [interests, setInterests] = useState([]);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const areas = params.get("areas");
    const products = params.get("products");
    if (products) {
      setForm((f) => (f.message ? f : { ...f, message: `I'm interested in: ${products}.` }));
    }
    if (areas) {
      const labels = areas.split(", ");
      const slugs = TIME_SINKS.filter((t) => labels.includes(t.label)).map((t) => t.slug);
      setInterests(SERVICES.filter((s) => slugs.includes(s.slug)).map((s) => s.title));
      setForm((f) => (f.message ? f : { ...f, message: `I need help with: ${areas}.` }));
    }
  }, []);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleInterest = (name) => {
    setStepError("");
    setInterests((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };
  const continueFromAreas = (e) => {
    e.preventDefault();
    if (interests.length === 0) {
      setStepError("Choose at least one area to continue.");
      return;
    }
    setStepError("");
    setStep(1);
  };
  const continueFromBusiness = (e) => {
    e.preventDefault();
    setStep(2);
  };
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
        <h1>Request Access</h1>
        <p className="hero-sub">
          Three quick steps: tell us what you need, a little about your business, and what is taking your time.
          We'll follow up by email to set up a short call.
        </p>
      </section>
      <section className="section">
        <div className="contact-grid">
          <div>
            <ol className="funnel-progress" aria-label="Request progress">
              {FUNNEL_STEPS.map((label, i) => (
                <li key={label} className={"funnel-step" + (i === step ? " on" : i < step ? " done" : "")}>
                  <span className="funnel-dot">{i < step ? "\u2713" : i + 1}</span>
                  <span>{label}</span>
                </li>
              ))}
            </ol>

            {step === 0 && (
              <form className="contact-form" onSubmit={continueFromAreas}>
                <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                  <legend style={{ fontWeight: 600, color: COLORS.navy, marginBottom: "0.6rem" }}>
                    Which areas interest you? Choose all that apply.
                  </legend>
                  {INTEREST_OPTIONS.map((name) => (
                    <label key={name} className="funnel-option">
                      <input type="checkbox" checked={interests.includes(name)} onChange={() => toggleInterest(name)} />
                      <span>{name}</span>
                    </label>
                  ))}
                </fieldset>
                {stepError && <p className="funnel-error" role="alert">{stepError}</p>}
                <div className="funnel-actions">
                  <span />
                  <button className="btn-primary" type="submit">Continue</button>
                </div>
              </form>
            )}

            {step === 1 && (
              <form className="contact-form" onSubmit={continueFromBusiness}>
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
                <div className="funnel-actions">
                  <button type="button" className="btn-text" onClick={() => setStep(0)}>&larr; Back</button>
                  <button className="btn-primary" type="submit">Continue</button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form className="contact-form" onSubmit={submit}>
                <div className="funnel-summary">
                  <strong>Interested in:</strong> {interests.join(", ")}<br />
                  <strong>Business:</strong> {form.business}{form.type ? ` (${form.type})` : ""}<br />
                  <strong>Contact:</strong> {form.name}, {form.email}
                </div>
                <label>
                  What administrative work is taking your time?
                  <textarea rows={4} value={form.message} onChange={update("message")} />
                </label>
                <div className="funnel-actions">
                  <button type="button" className="btn-text" onClick={() => setStep(1)}>&larr; Back</button>
                  <button className="btn-primary" type="submit">Send Request</button>
                </div>
              </form>
            )}
          </div>
          <div className="contact-side">
            <h2>Direct Contact</h2>
            <p>admin@aurumventura.net</p>
            <p>850-653-7797</p>
            <h2>Connect</h2>
            <p>
              <a
                href={GOOGLE_BUSINESS_URL !== "YOUR_GOOGLE_BUSINESS_URL_HERE" ? GOOGLE_BUSINESS_URL : "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: COLORS.teal, textDecoration: "underline" }}
              >
                View Aurum Ventura on Google
              </a>
            </p>
            <h2>Typical Response</h2>
            <p>Within one business day.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ROICalculatorPage({ setPage }) {
  const [hours, setHours] = useState(10);
  const [rate, setRate] = useState(30);
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };

  const weeklyTime = hours;
  const monthlyTime = hours * 4.3;
  const yearlyTime = hours * 52;
  const weeklyCost = hours * rate;
  const monthlyCost = weeklyCost * 4.3;
  const yearlyCost = weeklyTime * rate;

  return (
    <div>
      <section className="page-head">
        <p className="kicker">Time Savings Calculator</p>
        <h1>Calculate Your ROI</h1>
        <p className="hero-sub">
          See how much time and money you could save by outsourcing administrative work to Aurum Ventura.
        </p>
      </section>
      <section className="section" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ background: "#f5f5f5", padding: "2rem", borderRadius: "8px" }}>
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
              Hours spent on admin work per week
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <input
                type="range"
                min="1"
                max="50"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: "1.2rem", fontWeight: "600", minWidth: "50px" }}>{hours} hrs</span>
            </div>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
              Your hourly rate ($)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: "1.2rem", fontWeight: "600", minWidth: "70px" }}>${rate}/hr</span>
            </div>
          </div>

          <div style={{ borderTop: "2px solid #ddd", paddingTop: "1.5rem", marginTop: "2rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", color: COLORS.teal }}>Your Potential Savings</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ padding: "1rem", background: COLORS.white, borderRadius: "4px" }}>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: COLORS.slate }}>Per Week</p>
                <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "600", color: COLORS.navy }}>
                  ${weeklyCost.toLocaleString()}
                </p>
              </div>
              <div style={{ padding: "1rem", background: COLORS.white, borderRadius: "4px" }}>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: COLORS.slate }}>Per Month</p>
                <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "600", color: COLORS.navy }}>
                  ${monthlyCost.toLocaleString(undefined, {maximumFractionDigits: 0})}
                </p>
              </div>
              <div style={{ padding: "1rem", background: COLORS.white, borderRadius: "4px", gridColumn: "1 / -1" }}>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: COLORS.slate }}>Per Year</p>
                <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "600", color: COLORS.navy }}>
                  ${yearlyCost.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <p style={{ margin: "1.5rem 0 0 0", fontSize: "0.85rem", color: COLORS.slate, textAlign: "center" }}>
            *Based on hours per week × your hourly rate. Actual savings depend on scope of work and service fee.
          </p>
        </div>
      </section>

      <section className="cta-band">
        <h2>Ready to reclaim your time?</h2>
        <p>Let's talk about your specific needs and get you a custom quote.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Request a Consultation</a>
      </section>
    </div>
  );
}

function FAQPage({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };
  const faqs = [
    {
      q: "How is Aurum Ventura different from a virtual assistant?",
      a: "Virtual assistants typically work as independent contractors on tasks you assign day-to-day. Aurum Ventura provides a defined scope of administrative support with reserved capacity, clear pricing, and a master agreement that protects both sides. We focus on systems and consistency, not just task completion."
    },
    {
      q: "What's included in a scope of services?",
      a: "Every scope is custom-built around your specific needs. We assess what administrative work is taking your time, then define exactly what Aurum Ventura will handle, how many hours per month you get, and what the fixed monthly fee is. Nothing surprises you later."
    },
    {
      q: "How long does it take to get started?",
      a: "After you request a consultation, we do a needs assessment (typically a 30-minute call), provide a written proposal, and set up your access—which takes about 5–10 business days. Then you're live."
    },
    {
      q: "Can you handle confidential or sensitive business information?",
      a: "Yes. Every team member signs a confidentiality agreement. Your data is encrypted in transit and at rest. Access is limited to staff actually working your account. We outline exactly how we handle your information in our master agreement."
    },
    {
      q: "What if my needs change?",
      a: "Your scope is designed for flexibility. If your needs shift, we adjust your scope and pricing to match. You're not locked in—we can scale up, scale down, or change what we handle."
    },
    {
      q: "Do you work with businesses outside the United States?",
      a: "We primarily serve U.S.-based businesses. If you're outside the US but have a US business location or operations, contact us to discuss."
    },
    {
      q: "What happens if you can't complete something in my scope?",
      a: "Everything in your scope is prioritized against your reserved capacity. If something unexpected comes up that's outside scope, we flag it and get your approval before we start work on it—we don't just bill you extra."
    },
    {
      q: "How do you measure success?",
      a: "We track what moves through your scope each month and report on it. You see exactly what we handled, how much capacity you used, and what's available for next month. Success looks like you getting your time back."
    }
  ];

  return (
    <div>
      <section className="page-head">
        <p className="kicker">FAQ</p>
        <h1>Frequently Asked Questions</h1>
        <p className="hero-sub">
          Answers to common questions about how Aurum Ventura works, what's included, and how we support your business.
        </p>
      </section>
      <section className="section" style={{ maxWidth: "720px", margin: "0 auto" }}>
        {faqs.map((faq, i) => (
          <div key={i} style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: i < faqs.length - 1 ? "1px solid #E4E9EF" : "none" }}>
            <h3 style={{ margin: "0 0 0.8rem 0", color: COLORS.navy, fontSize: "1.1rem" }}>{faq.q}</h3>
            <p style={{ margin: 0, lineHeight: "1.6", color: COLORS.slate }}>{faq.a}</p>
          </div>
        ))}
      </section>

      <section className="cta-band">
        <h2>Have other questions?</h2>
        <p>Get in touch—we're happy to talk through your specific situation.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Contact Us</a>
      </section>
    </div>
  );
}

function AlternativesPage({ setPage }) {
  const go = (key) => (e) => { e.preventDefault(); setPage(key); };

  const comparisons = [
    {
      option: "Virtual Assistants (Freelance)",
      pros: ["Low cost", "Easy to hire", "Flexible hours"],
      cons: ["No continuity if they leave", "Limited accountability", "You manage day-to-day tasks", "No infrastructure"],
      aurum: "Defined scope, consistency, reserved capacity, no turnover risk"
    },
    {
      option: "DIY (Handle it yourself)",
      pros: ["Full control", "No extra cost"],
      cons: ["Takes your personal time", "Errors cost money", "No systems", "Slows growth"],
      aurum: "Get your time back, professional handling, scalable systems"
    },
    {
      option: "Internal Hire (Full-time employee)",
      pros: ["Team member", "Long-term knowledge"],
      cons: ["High cost ($35K-$50K+/year)", "Benefits, payroll, management", "Not flexible", "Growing businesses don't need full-time admin"],
      aurum: "Pay for what you use, no employment overhead, no management load"
    },
    {
      option: "VA Marketplace (Upwork, Fiverr, etc.)",
      pros: ["Wide talent pool", "Transparent pricing"],
      cons: ["Quality varies", "Time zone issues", "No accountability", "You find and manage people"],
      aurum: "Vetted, consistent, accountable team that knows your business"
    }
  ];

  return (
    <div>
      <section className="page-head">
        <p className="kicker">Why Choose Aurum Ventura</p>
        <h1>Aurum vs Other Options</h1>
        <p className="hero-sub">
          How we compare to virtual assistants, doing it yourself, hiring full-time, and freelance marketplaces.
        </p>
      </section>

      <section className="section" style={{ maxWidth: "900px", margin: "0 auto" }}>
        {comparisons.map((comp, i) => (
          <div key={i} style={{ marginBottom: "2.5rem", padding: "1.5rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #E4E9EF" }}>
            <h3 style={{ margin: "0 0 1rem 0", color: COLORS.navy }}>{comp.option}</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: "600", color: COLORS.teal }}>Pros</p>
                <ul style={{ margin: "0", paddingLeft: "1.2rem", color: COLORS.slate, fontSize: "0.95rem" }}>
                  {comp.pros.map((pro, j) => <li key={j} style={{ marginBottom: "0.4rem" }}>{pro}</li>)}
                </ul>
              </div>
              <div>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: "600", color: "#c84b31" }}>Cons</p>
                <ul style={{ margin: "0", paddingLeft: "1.2rem", color: COLORS.slate, fontSize: "0.95rem" }}>
                  {comp.cons.map((con, j) => <li key={j} style={{ marginBottom: "0.4rem" }}>{con}</li>)}
                </ul>
              </div>
            </div>

            <div style={{ padding: "1rem", background: COLORS.ice, borderRadius: "4px", borderLeft: `4px solid ${COLORS.teal}` }}>
              <p style={{ margin: 0, fontSize: "0.95rem", color: COLORS.navy }}>
                <strong>Aurum Ventura:</strong> {comp.aurum}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="section alt" style={{ maxWidth: "720px", margin: "2rem auto 0" }}>
        <h2 style={{ textAlign: "center" }}>The Real Question</h2>
        <p style={{ textAlign: "center", color: COLORS.slate }}>
          Administrative support isn't about finding the cheapest option. It's about getting your time back so you can focus on serving clients and growing your business. Aurum Ventura gives you consistency, accountability, and professional handling—without the overhead of an internal hire.
        </p>
      </section>

      <section className="cta-band">
        <h2>Ready to see if we're a fit?</h2>
        <p>Let's talk about your specific situation and build a custom scope.</p>
        <a className="btn-primary" href={pathFor("Contact")} onClick={go("Contact")}>Request a Consultation</a>
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
          readBatch();
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
  const [submitState, setSubmitState] = useState("idle");
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
          ? `\".${fileExtension(file.name) || "?"}\" isn't a supported file type.`
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
        try { message = JSON.parse(xhr.responseText).message || ""; } catch { }
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
    } catch { }
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
    } catch { }
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
  Home: "Back Office Administrative Support | Aurum Ventura",
  Services: `Services | Aurum Ventura`,
  Products: `Business Systems & Products | Aurum Ventura`,
  ProgramsPartnerships: `Programs & Partnerships | Aurum Ventura`,
  About: `About | Aurum Ventura`,
  Industries: `Industries | Aurum Ventura`,
  HowItWorks: `How It Works | Aurum Ventura`,
  Security: `Security & Confidentiality | Aurum Ventura`,
  Privacy: `Privacy Policy | Aurum Ventura`,
  Terms: `Terms of Service | Aurum Ventura`,
  Contact: `Contact | Aurum Ventura`,
  ROICalculator: `Calculate Your Time Savings | Aurum Ventura`,
  FAQ: `Frequently Asked Questions | Aurum Ventura`,
  Alternatives: `Aurum Ventura vs Virtual Assistants & DIY | Aurum Ventura`,
  Upload: `Upload Documents | Aurum Ventura`,
  ClientIntake: `Client Intake | Aurum Ventura`,
  AdminLogin: `Admin | Aurum Ventura`,
  AdminIntakes: `Client Intakes | Aurum Ventura`,
};
const PAGE_DESCRIPTIONS = {
  Home: "Administrative support that gives you 10 to 16 hours a week back. Document prep, invoicing, vendor admin, CRM, and license tracking.",
  Services: "Recurring administrative services: document prep, invoicing, license tracking, vendor administration, CRM data, and project admin.",
  Products: "Automated business systems: growth systems for outreach and follow-up, and intelligence systems for prospect research and market data.",
  ProgramsPartnerships: "Implementation partnerships for organizations that support entrepreneurs: hands-on operational systems and back-office setup.",
  About: "Nashville-based outsourced administrative back office for small and growing businesses nationwide. Learn about our approach.",
  Industries: "Back-office and administrative support for contractors, property managers, cleaning, construction, staffing, real estate, and professional services.",
  HowItWorks: "How Aurum Ventura's back-office support process works — from consultation through service delivery and monthly reporting.",
  Security: "How Aurum Ventura secures and protects your business documents, information, and confidentiality when providing remote administrative services.",
  Privacy: "Privacy policy for Aurum Ventura's website and back-office administrative services for businesses nationwide.",
  Terms: "Terms of service for Aurum Ventura's remote back-office administrative support services.",
  Contact: "Contact Aurum Ventura to request a consultation about outsourced back-office administrative support for your business.",
  ROICalculator: "Free calculator to estimate how much time and money you could save by outsourcing administrative tasks to Aurum Ventura.",
  FAQ: "Answers to common questions about Aurum Ventura's administrative support services, pricing, process, and how we work with businesses.",
  Alternatives: "Compare Aurum Ventura to virtual assistants, DIY management, and other administrative support options for your business.",
  Upload: "Securely upload documents and submit administrative requests to Aurum Ventura.",
  ClientIntake: "Complete client intake to set up outsourced back-office administrative services with Aurum Ventura.",
  AdminLogin: "Internal Aurum Ventura administration.",
  AdminIntakes: "Internal Aurum Ventura administration.",
};

function getServiceSchema(service, url) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": service.title,
    "description": service.summary,
    "provider": {
      "@type": "LocalBusiness",
      "name": "Aurum Ventura Enterprise LLC",
      "url": "https://www.aurumventura.net"
    },
    "url": url,
    "areaServed": { "@type": "Country", "name": "United States" }
  };
}

function getBreadcrumbSchema(items, url) {
  // items should be array of {name, path} or {name} for current
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.path ? `https://www.aurumventura.net${item.path}` : url
    }))
  };
}

function getFAQSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How is Aurum Ventura different from a virtual assistant?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Virtual assistants typically work as independent contractors on tasks you assign day-to-day. Aurum Ventura provides a defined scope of administrative support with reserved capacity, clear pricing, and a master agreement that protects both sides."
        }
      },
      {
        "@type": "Question",
        "name": "What's included in a scope of services?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Every scope is custom-built around your specific needs. We assess what administrative work is taking your time, then define exactly what Aurum Ventura will handle, reserved hours, and the fixed monthly fee."
        }
      },
      {
        "@type": "Question",
        "name": "How long does it take to get started?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "After you request a consultation, we do a needs assessment, provide a written proposal, and set up your access—which takes about 5–10 business days."
        }
      },
      {
        "@type": "Question",
        "name": "Can you handle confidential business information?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Every team member signs a confidentiality agreement. Your data is encrypted in transit and at rest. Access is limited to staff actually working your account."
        }
      }
    ]
  };
}

// Structured data for the page being rendered. Absolute URLs use the page path
// so every prerendered page declares its own Service/Breadcrumb/FAQ schema.
function schemasFor(page, pathname) {
  const url = "https://www.aurumventura.net" + pathname;
  const schemas = [ORGANIZATION_SCHEMA];
  const service = SERVICES.find((s) => s.slug === page);
  if (service) {
    schemas.push(getServiceSchema(service, url));
    schemas.push(getBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Services", path: "/services" },
      { name: service.title },
    ], url));
  }
  if (typeof page === "string" && page.startsWith("industry:")) {
    const industry = slugToIndustry(page.slice("industry:".length));
    if (industry) {
      schemas.push(getBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Industries", path: "/industries" },
        { name: industry },
      ], url));
    }
  }
  if (page === "FAQ") schemas.push(getFAQSchema());
  return schemas;
}

export function metaFor(page) {
  if (typeof page === "string" && page.startsWith("product:")) {
    const product = ALL_PRODUCTS.find((p) => p.slug === page.slice("product:".length));
    if (product) {
      const details = PRODUCT_DETAILS[product.name];
      return {
        title: `${product.name} | Aurum Ventura`,
        description: details ? details.description : `${product.name}, a ${product.family.toLowerCase()} product from Aurum Ventura.`,
      };
    }
  }
  if (PAGE_TITLES[page]) return { title: PAGE_TITLES[page], description: PAGE_DESCRIPTIONS[page] };
  const service = SERVICES.find((s) => s.slug === page);
  if (service) return { title: `${service.seoTitle || service.title} | Aurum Ventura`, description: service.metaDescription || service.summary };
  if (typeof page === "string" && page.startsWith("industry:")) {
    const slug = page.slice("industry:".length);
    const industry = slugToIndustry(slug);
    if (industry && INDUSTRY_PAGE_COPY[industry]) {
      return { title: INDUSTRY_PAGE_COPY[industry].metaTitle, description: INDUSTRY_PAGE_COPY[industry].metaDescription };
    }
    if (industry) {
      return {
        title: `${industry} | Back-Office & Administrative Support | Aurum Ventura`,
        description: `Professional outsourced administrative support for ${industry.toLowerCase()} businesses nationwide. Custom-scoped services including Document Management, invoicing, License Tracking, Vendor Administration, and more.`
      };
    }
  }
  if (typeof page === "string" && page.startsWith("admin-intake:")) {
    return { title: `Intake Review | Aurum Ventura`, description: PAGE_DESCRIPTIONS.AdminIntakes };
  }
  return { title: PAGE_TITLES.Home, description: PAGE_DESCRIPTIONS.Home };
}

export default function App({ initialPath } = {}) {
  const [page, setPage] = useState(() =>
    pageFromPath(initialPath ?? (typeof window !== "undefined" ? window.location.pathname : "/"))
  );
  // Structured data is part of the rendered markup (not injected in an effect),
  // so the prerendered HTML carries it for crawlers that don't run JavaScript.
  const pathname = typeof window !== "undefined" ? window.location.pathname : (initialPath ?? "/");
  const schemas = schemasFor(page, pathname);


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
    Products: <ProductsPage setPage={navigate} />,
    ProgramsPartnerships: <ProgramsPartnershipsPage setPage={navigate} />,
    PreferredPartners: <PreferredPartnersPage setPage={navigate} />,
    PartnershipOpportunities: <PartnershipOpportunitiesPage setPage={navigate} />,
    About: <AboutPage setPage={navigate} />,
    Industries: <IndustriesPage setPage={navigate} />,
    HowItWorks: <HowItWorksPage setPage={navigate} />,
    Security: <SecurityPage setPage={navigate} />,
    Privacy: <PrivacyPage setPage={navigate} />,
    Terms: <TermsPage setPage={navigate} />,
    Contact: <ContactPage />,
    ROICalculator: <ROICalculatorPage setPage={navigate} />,
    FAQ: <FAQPage setPage={navigate} />,
    Alternatives: <AlternativesPage setPage={navigate} />,
    Upload: <UploadPage />,
    ClientIntake: <ClientIntakePage />,
    AdminLogin: <AdminLoginPage setPage={navigate} />,
    AdminIntakes: <AdminIntakesPage setPage={navigate} />,
  };
  const service = SERVICES.find((s) => s.slug === page);
  const isAdminIntakeDetail = typeof page === "string" && page.startsWith("admin-intake:");
  const isIndustryDetail = typeof page === "string" && page.startsWith("industry:");
  const isProductDetail = typeof page === "string" && page.startsWith("product:");
  const content = pages[page]
    || (service ? <ServiceDetailPage slug={page} setPage={navigate} />
    : isProductDetail ? <ProductDetailPage slug={page.slice("product:".length)} setPage={navigate} />
    : isIndustryDetail ? <IndustryDetailPage slug={page.slice("industry:".length)} setPage={navigate} />
    : isAdminIntakeDetail ? <AdminIntakeDetailPage intakeId={page.slice("admin-intake:".length)} setPage={navigate} />
    : pages.Home);

  return (
    <div className="app">
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      ))}
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

        /* Nav - FIXED SPACING */
        .nav { position: sticky; top: 0; background: ${COLORS.white}; border-bottom: 1px solid #E4E9EF; z-index: 50; overflow: visible; }
        .nav-inner { max-width: 1100px; margin: 0 auto; padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: flex-start; position: relative; gap: 2.2rem; }
        .nav-brand { display: flex; align-items: center; gap: 0.6rem; background: none; border: none; padding: 0; flex-shrink: 0; }
        .nav-mark { height: 34px; width: auto; }
        .nav-word { font-family: 'Cormorant Garamond', serif; font-size: 1.05rem; font-weight: 600; color: ${COLORS.navy}; text-align: left; line-height: 1.15; }
        .nav-word small { display: block; font-family: 'Montserrat', sans-serif; font-size: 0.6rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: ${COLORS.slate}; }
        .nav-links { display: flex; align-items: center; flex: 1; gap: 1.5rem; justify-content: space-evenly; }
        .nav-link { background: none; border: none; font-size: 0.82rem; font-weight: 400; color: ${COLORS.slate}; padding: 0.5rem 0.6rem; border-bottom: 2px solid transparent; display: flex; align-items: center; justify-content: center; text-align: center; min-height: 2.5rem; white-space: nowrap; }
        .nav-link.active, .nav-link:hover { color: ${COLORS.navy}; border-bottom-color: ${COLORS.aqua}; }
        .nav-cta { background: ${COLORS.navy}; color: ${COLORS.white}; border: none; padding: 0.6rem 1.2rem; font-size: 0.82rem; font-weight: 600; letter-spacing: 0.02em; flex-shrink: 0; margin-left: 1.2rem; }
        .nav-cta:hover, .nav-cta.active { background: ${COLORS.teal}; }
        .nav-burger { display: none; flex-direction: column; gap: 4px; background: none; border: none; padding: 0.4rem; flex-shrink: 0; }
        .nav-burger span { width: 22px; height: 2px; background: ${COLORS.navy}; }
        .nav-mobile { display: none; }

        /* Dropdown Styles */
        .nav-dropdown { position: relative; }
        .nav-dropdown-trigger { display: inline-flex; align-items: center; gap: 0.35rem; }
        .nav-chevron { display: inline-flex; align-items: center; font-size: 0.7rem; transition: transform 0.2s ease; }
        .nav-dropdown-trigger.open .nav-chevron { transform: scaleY(-1); }
        .nav-dropdown-menu { position: absolute; top: 100%; left: 0; background: ${COLORS.white}; border: 1px solid #E4E9EF; border-top: none; border-radius: 0 0 4px 4px; box-shadow: 0 4px 12px rgba(4, 25, 68, 0.08); min-width: 220px; z-index: 100; animation: slideDown 0.2s ease; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .nav-dropdown-item { display: block; padding: 0.7rem 1.1rem; font-size: 0.88rem; color: ${COLORS.slate}; text-decoration: none; transition: background 0.15s ease, color 0.15s ease; }
        .nav-dropdown-item:hover { background: ${COLORS.ice}; color: ${COLORS.navy}; }
        .nav-dropdown-item:first-child { border-top: 1px solid #E4E9EF; }

        @media (max-width: 768px) {
          .nav-links { display: none; flex: none; }
          .nav-burger { display: flex; }
          .nav-mobile { display: flex; flex-direction: column; border-top: 1px solid #E4E9EF; padding: 0.5rem 1.5rem 1rem; }
          .nav-mobile-link { text-align: left; background: none; border: none; padding: 0.6rem 0; font-size: 0.95rem; color: ${COLORS.slate}; }
          .nav-mobile-link.active { color: ${COLORS.navy}; font-weight: 600; }
          .nav-mobile-cta { color: ${COLORS.navy}; font-weight: 600; margin-top: 0.4rem; }
          .nav-mobile-cta.active { color: ${COLORS.teal}; }

          /* Mobile Dropdown Styles */
          .nav-dropdown-trigger { display: none; }
          .nav-dropdown-menu { display: none; }
          .nav-mobile-dropdown-trigger { display: flex; align-items: center; justify-content: space-between; width: 100%; background: none; border: none; padding: 0.6rem 0; font-size: 0.95rem; color: ${COLORS.slate}; cursor: pointer; font-family: inherit; }
          .nav-mobile-dropdown-trigger .nav-mobile-link.active { color: ${COLORS.navy}; font-weight: 600; }
          .nav-mobile-chevron { display: inline-flex; align-items: center; font-size: 0.7rem; transition: transform 0.2s ease; }
          .nav-mobile-chevron.open { transform: scaleY(-1); }
          .nav-mobile-dropdown { display: flex; flex-direction: column; background: ${COLORS.ice}; border-radius: 4px; margin-top: 0.3rem; padding: 0.4rem 0; }
          .nav-mobile-dropdown-item { display: block; padding: 0.6rem 0 0.6rem 1.2rem; font-size: 0.85rem; color: ${COLORS.slate}; text-decoration: none; transition: color 0.15s ease; }
          .nav-mobile-dropdown-item:hover { color: ${COLORS.navy}; }
        }

        /* Hero */
        .hero { position: relative; overflow: hidden; padding: 3rem 1.5rem 3rem; }
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
        .cost-highlight { max-width: 600px; background: #FEF9F5; border-left: 4px solid ${COLORS.teal}; padding: 1.4rem 1.6rem; margin: 1.2rem 0 1.8rem; }
        .cost-emphasis { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 600; color: ${COLORS.teal}; line-height: 1.2; margin: 0; }
        .mission-statement { max-width: 620px; background: ${COLORS.ice}; border-left: 3px solid ${COLORS.teal}; border-radius: 4px; padding: 1.3rem 1.5rem; margin: 1rem 0 1.5rem; }
        .mission-statement p { font-size: 1rem; line-height: 1.65; color: ${COLORS.navy}; margin-bottom: 0.9rem; }
        .mission-statement p:last-child { margin-bottom: 0; }
        .page-head { max-width: 1100px; margin: 0 auto; padding: 2.8rem 1.5rem 0.5rem; }
        .page-head .hero-sub { max-width: 640px; margin-bottom: 0.5rem; }
        .page-head + .section { padding-top: 1.6rem; }
        .legal-updated { color: ${COLORS.slate}; font-size: 0.85rem; }
        .legal-body { max-width: 720px; }
        .legal-body h2 { font-size: 1.15rem; margin: 1.8rem 0 0.6rem; }
        .legal-body h2:first-child { margin-top: 0; }
        .legal-body p { font-size: 0.95rem; line-height: 1.65; color: ${COLORS.slate}; margin: 0 0 1rem; }
        .legal-body a { color: ${COLORS.teal}; text-decoration: underline; }

        .plain-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.1rem 2rem; margin: 1.1rem 0 1.3rem; }
        .plain-grid-item { display: flex; gap: 0.7rem; align-items: baseline; padding: 0.6rem 0; border-bottom: 1px solid #E4E9EF; font-size: 0.92rem; color: ${COLORS.navy}; width: 100%; background: none; border-left: none; border-right: none; border-top: none; text-align: left; font-family: inherit; cursor: pointer; }
        .plain-grid-item:hover { color: ${COLORS.teal}; border-bottom-color: ${COLORS.teal}; }
        .plain-grid-item h3 { font: inherit; font-weight: inherit; color: inherit; margin: 0; }
        .plain-num { color: ${COLORS.teal}; font-weight: 600; font-size: 0.8rem; }
        .badge-one-time { display: inline-block; margin-left: 0.6rem; background: ${COLORS.ice}; color: ${COLORS.teal}; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 20px; vertical-align: middle; }
        .badge-one-time-h1 { font-size: 0.68rem; vertical-align: super; margin-left: 0.8rem; }
        @media (max-width: 640px) { .plain-grid { grid-template-columns: 1fr; } }

        .principle-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.2rem 2.5rem; margin: 1.3rem 0 1.5rem; }
        .principle-item { display: flex; gap: 0.7rem; padding: 0.8rem 0; border-bottom: 1px solid #E4E9EF; }
        .principle-item h3 { font-family: inherit; font-weight: 600; font-size: 0.92rem; color: ${COLORS.navy}; margin: 0 0 0.25rem; }
        .principle-item p { font-size: 0.85rem; color: ${COLORS.slate}; line-height: 1.5; margin: 0; }
        .principle-num { flex-shrink: 0; color: ${COLORS.teal}; font-weight: 600; font-size: 0.8rem; padding-top: 0.2rem; }
        @media (max-width: 640px) { .principle-grid { grid-template-columns: 1fr; } }

        .trust-facts { display: flex; flex-wrap: wrap; gap: 0.6rem 1.6rem; margin: 1.2rem 0 1.4rem; padding: 1rem 0; border-top: 1px solid #D6E4EA; border-bottom: 1px solid #D6E4EA; }
        .trust-facts span { font-size: 0.85rem; font-weight: 600; color: ${COLORS.navy}; }

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

        /* Two-Path Section */
        .two-path-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem; margin: 1.6rem auto 1.8rem; max-width: 900px; }
        .two-path-card { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: ${COLORS.ice}; padding: 2.8rem 1.9rem; border-radius: 4px; border-left: 3px solid ${COLORS.aqua}; min-height: 280px; }
        .two-path-card h3 { font: inherit; font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: 1.3rem; color: ${COLORS.navy}; margin: 0 0 0.4rem; }
        .two-path-card p { font-size: 0.95rem; line-height: 1.65; color: ${COLORS.navy}; margin: 0 0 0.8rem; }
        .two-path-card .btn-text { font-size: 0.9rem; }
        .shop-layout { display: grid; grid-template-columns: 220px 1fr; gap: 2.5rem; max-width: 1200px; margin: 0 auto; align-items: start; }
        .shop-sidebar { display: flex; flex-direction: column; gap: 0.75rem; border-right: 1px solid #E4E9EF; padding-right: 1.5rem; }
        .shop-filter { display: flex; align-items: center; gap: 0.6rem; font-size: 0.92rem; color: ${COLORS.navy}; cursor: pointer; }
        .shop-filter:has(input:disabled) { cursor: not-allowed; }
        .shop-filter input { accent-color: ${COLORS.teal}; margin: 0; }
        .shop-filter .shop-count { margin-left: auto; color: ${COLORS.slate}; font-size: 0.82rem; }
        .shop-toolbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.6rem; }
        .shop-count-line { font-size: 0.9rem; color: ${COLORS.slate}; margin: 0 0 0.6rem; }
        .shop-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
        .shop-chip { background: ${COLORS.ice}; border: 1px solid #B8D4E8; border-radius: 999px; padding: 0.3rem 0.8rem; font-family: inherit; font-size: 0.82rem; color: ${COLORS.navy}; cursor: pointer; }
        .shop-clear { background: none; border: none; padding: 0.3rem 0.2rem; font-family: inherit; font-size: 0.82rem; color: ${COLORS.teal}; text-decoration: underline; cursor: pointer; }
        .shop-select { padding: 0.5rem 0.8rem; border: 1px solid #C9D3DE; border-radius: 4px; font-family: inherit; font-size: 0.88rem; background: ${COLORS.white}; color: ${COLORS.navy}; }
        .shop-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.2rem 1.4rem; }
        .shop-card { display: flex; flex-direction: column; gap: 0.35rem; }
        .shop-image { aspect-ratio: 4 / 3; background: linear-gradient(135deg, ${COLORS.ice}, #B8D4E8); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 2.4rem; color: ${COLORS.teal}; margin-bottom: 0.6rem; }
        .shop-image-button { display: block; width: 100%; padding: 0; background: none; border: none; cursor: zoom-in; }
        .shop-zoom-overlay { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 100; background: rgba(4, 25, 68, 0.9); display: flex; align-items: center; justify-content: center; padding: 1.5rem; cursor: zoom-out; }
        .shop-zoom-overlay img { max-width: 100%; max-height: 90vh; width: auto; height: auto; border-radius: 4px; cursor: default; }
        .shop-zoom-close { position: absolute; top: 0.8rem; right: 1rem; background: none; border: none; color: ${COLORS.white}; font-size: 2.4rem; line-height: 1; cursor: pointer; padding: 0.2rem 0.5rem; }
        .shop-image-photo { display: block; width: 100%; height: auto; object-fit: cover; background: none; padding: 0; font-size: 0; }
        .funnel-progress { display: flex; flex-wrap: wrap; gap: 1rem 1.6rem; list-style: none; padding: 0; margin: 0 0 2rem; }
        .funnel-step { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: ${COLORS.slate}; }
        .funnel-step.on, .funnel-step.done { color: ${COLORS.navy}; }
        .funnel-step.on { font-weight: 600; }
        .funnel-dot { width: 1.8rem; height: 1.8rem; border-radius: 50%; border: 1px solid #C9D3DE; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; background: ${COLORS.white}; }
        .funnel-step.on .funnel-dot, .funnel-step.done .funnel-dot { background: ${COLORS.teal}; border-color: ${COLORS.teal}; color: ${COLORS.white}; }
        .funnel-option { display: flex; align-items: center; gap: 0.6rem; font-size: 0.95rem; color: ${COLORS.navy}; margin: 0.55rem 0; cursor: pointer; }
        .funnel-option input { accent-color: ${COLORS.teal}; margin: 0; }
        .funnel-actions { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1rem; }
        .funnel-summary { background: ${COLORS.ice}; border-left: 3px solid ${COLORS.aqua}; padding: 1rem 1.2rem; font-size: 0.95rem; line-height: 1.7; color: ${COLORS.navy}; }
        .funnel-error { color: #D63D2E; font-size: 0.9rem; margin: 0.8rem 0 0; }
        .shop-detail { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; max-width: 1100px; margin: 0 auto; }
        .shop-detail-image { display: block; width: 100%; height: auto; border-radius: 4px; }
        .shop-detail h1 { font-size: clamp(2rem, 4vw, 2.8rem); margin: 0.4rem 0 1rem; }
        .shop-detail h3 { font-size: 1.2rem; margin: 1.6rem 0 0.4rem; }
        .shop-detail p { font-size: 0.98rem; line-height: 1.65; color: ${COLORS.slate}; margin: 0; }
        .shop-detail .section-lead { color: ${COLORS.navy}; }
        @media (max-width: 720px) { .shop-detail { grid-template-columns: 1fr; gap: 1.5rem; } }
        .shop-family { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ${COLORS.teal}; margin: 0; }
        .shop-name { font-size: 1.2rem; margin: 0; }
        .shop-name-link { color: ${COLORS.navy}; text-decoration: underline; text-underline-offset: 0.2em; text-decoration-thickness: 1px; }
        .shop-name-link:hover, .shop-name-link:focus-visible { color: ${COLORS.teal}; }
        .shop-name-arrow { display: inline-block; margin-left: 0.3rem; transition: transform 0.15s ease; }
        .shop-name-link:hover .shop-name-arrow, .shop-name-link:focus-visible .shop-name-arrow { transform: translateX(3px); }
        .shop-card .btn-text { align-self: flex-start; margin-top: 0.3rem; font-size: 0.88rem; }
        .shop-soon { align-self: flex-start; margin-top: 0.3rem; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${COLORS.slate}; border: 1px solid #C9D3DE; border-radius: 999px; padding: 0.3rem 0.8rem; }
        .shop-add { align-self: flex-start; margin-top: 0.4rem; background: ${COLORS.white}; border: 1px solid ${COLORS.teal}; border-radius: 4px; padding: 0.5rem 0.9rem; font-family: inherit; font-size: 0.82rem; font-weight: 600; color: ${COLORS.teal}; cursor: pointer; }
        .shop-add[aria-pressed="true"] { background: ${COLORS.teal}; color: ${COLORS.white}; }
        .shop-requestbar { position: sticky; bottom: 0; z-index: 50; background: ${COLORS.navy}; color: ${COLORS.white}; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; padding: 0.9rem 1.5rem; font-size: 0.92rem; }
        .shop-requestbar-actions { display: flex; align-items: center; gap: 1rem; }
        .shop-requestbar-clear { background: none; border: none; color: ${COLORS.white}; font-family: inherit; font-size: 0.85rem; text-decoration: underline; cursor: pointer; }
        .shop-requestbar .btn-primary { background: ${COLORS.aqua}; }
        @media (max-width: 900px) { .shop-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 720px) {
          .shop-layout { grid-template-columns: 1fr; gap: 1.5rem; }
          .shop-sidebar { flex-direction: row; flex-wrap: wrap; gap: 0.6rem 1.2rem; border-right: none; padding-right: 0; padding-bottom: 1rem; border-bottom: 1px solid #E4E9EF; }
          .shop-sidebar h3 { width: 100%; }
          .shop-grid { grid-template-columns: 1fr 1fr; gap: 1.6rem 1rem; }
        }
        @media (max-width: 760px) { .two-path-grid { grid-template-columns: 1fr; } }

        /* Programs & Partnerships Page */
        .partner-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.2rem; margin: 1.5rem 0 2rem; }
        .partner-card { padding: 1.2rem 1.4rem; border-left: 3px solid ${COLORS.aqua}; background: ${COLORS.white}; border-radius: 4px; box-shadow: 0 1px 2px rgba(4,25,68,0.04); transition: border-color 0.3s ease, box-shadow 0.3s ease; }
        .partner-card h3 { font: inherit; font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: 1.05rem; color: ${COLORS.navy}; margin: 0 0 0.5rem 0; line-height: 1.3; }
        .partner-card p { font-size: 0.9rem; color: ${COLORS.slate}; margin-bottom: 0.8rem; line-height: 1.55; }
        .partner-card:hover { border-left-color: ${COLORS.teal}; box-shadow: 0 2px 6px rgba(4,25,68,0.08); }
        .partner-logo { width: 40px; height: 40px; margin-bottom: 0.8rem; object-fit: contain; }
        .partner-link { display: inline-block; color: ${COLORS.teal}; font-weight: 600; font-size: 0.85rem; text-decoration: none; border-bottom: 1px solid ${COLORS.teal}; padding-bottom: 0.2rem; transition: color 0.2s ease; }
        .partner-link:hover { color: ${COLORS.navy}; border-bottom-color: ${COLORS.navy}; }
        @media (max-width: 640px) { .partner-grid { grid-template-columns: 1fr; } }

        .partner-profile { max-width: 640px; margin: 0 auto; text-align: center; padding: 1rem 0; }
        .partner-profile-logo { width: 80px; height: 80px; margin: 0 auto 1.5rem; object-fit: contain; display: block; }
        .partner-profile h2 { font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; font-weight: 600; color: ${COLORS.navy}; margin: 0 0 1rem; line-height: 1.1; }
        .partner-meta { margin-bottom: 1.5rem; }
        .partner-type { font-size: 0.9rem; font-weight: 600; color: ${COLORS.teal}; letter-spacing: 0.05em; text-transform: uppercase; margin: 0; }
        .partner-description { font-size: 1rem; color: ${COLORS.slate}; line-height: 1.65; margin: 1.5rem 0 2rem; }
        .partner-profile-links { display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 2rem; }
        .btn-secondary { display: inline-block; background: ${COLORS.white}; color: ${COLORS.teal}; border: 1.5px solid ${COLORS.teal}; padding: 0.75rem 1.5rem; font-size: 0.9rem; font-weight: 600; text-decoration: none; transition: background 0.2s ease, color 0.2s ease; }
        .btn-secondary:hover { background: ${COLORS.ice}; color: ${COLORS.navy}; border-color: ${COLORS.navy}; }
        .partner-website { text-align: center; padding-top: 1.5rem; border-top: 1px solid #E4E9EF; }
        .website-label { font-size: 0.85rem; font-weight: 600; color: ${COLORS.slate}; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.5rem; }
        .website-link { display: inline-block; font-size: 1.05rem; color: ${COLORS.teal}; font-weight: 600; text-decoration: none; padding-bottom: 0.3rem; border-bottom: 2px solid ${COLORS.teal}; transition: color 0.2s ease, border-color 0.2s ease; }
        .website-link:hover { color: ${COLORS.navy}; border-bottom-color: ${COLORS.navy}; }

        .systems-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.7rem 1.5rem; margin: 1.5rem 0 2rem; max-width: 720px; }
        .system-item { display: flex; gap: 0.8rem; font-size: 0.92rem; color: ${COLORS.navy}; line-height: 1.4; }
        .system-bullet { color: ${COLORS.teal}; font-weight: 600; flex-shrink: 0; }
        @media (max-width: 640px) { .systems-grid { grid-template-columns: 1fr; } }

        .process-steps { display: grid; grid-template-columns: 1fr; gap: 1.4rem; margin: 1.6rem 0 2rem; max-width: 720px; }
        .process-step { display: flex; gap: 1.2rem; }
        .step-number { flex-shrink: 0; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: ${COLORS.ice}; border: 1.5px solid ${COLORS.aqua}; color: ${COLORS.navy}; font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: 1rem; border-radius: 4px; }
        .step-content h3 { font-family: inherit; font-weight: 600; font-size: 1rem; color: ${COLORS.navy}; margin: 0 0 0.4rem; }
        .step-content p { font-size: 0.92rem; color: ${COLORS.slate}; line-height: 1.55; margin: 0; }

        .pilot-box { max-width: 620px; background: ${COLORS.ice}; border-left: 3px solid ${COLORS.aqua}; border-radius: 4px; padding: 1.3rem 1.5rem; margin: 1.3rem 0 1.6rem; }
        .pilot-box p { font-size: 0.95rem; line-height: 1.65; color: ${COLORS.navy}; margin-bottom: 1rem; }
        .pilot-box p:last-child { margin-bottom: 0; }

        .custom-note { max-width: 620px; background: ${COLORS.white}; border: 1px solid #E4E9EF; border-radius: 4px; padding: 1.4rem 1.6rem; margin: 1.3rem 0 1.6rem; }
        .custom-note p { font-size: 0.95rem; line-height: 1.65; color: ${COLORS.navy}; margin-bottom: 1rem; }
        .custom-note p:last-child { margin-bottom: 0; }

        .tag-list { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1rem; }
        .tag { border: 1px solid ${COLORS.teal}; color: ${COLORS.teal}; font-size: 0.82rem; font-weight: 500; padding: 0.35rem 0.9rem; border-radius: 4px; display: inline-block; }
        a.tag { cursor: pointer; transition: all 0.2s ease; background: transparent; }
        a.tag:hover { background: ${COLORS.teal}; color: ${COLORS.white}; border-color: ${COLORS.teal}; transform: translateY(-1px); box-shadow: 0 2px 6px rgba(9, 116, 139, 0.15); }
        .tag-toggle { background: none; font-family: inherit; cursor: pointer; transition: background 0.2s ease, color 0.2s ease; }
        .tag-toggle.selected { background: ${COLORS.teal}; color: ${COLORS.white}; }

        .industry-panel { margin-top: 1.3rem; padding-top: 1.1rem; border-top: 1px solid #E4E9EF; max-width: 560px; }
        .industry-panel-label { font-size: 0.78rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: ${COLORS.teal}; margin-bottom: 0.5rem; }
        .industry-examples { margin-top: 0; }
        .industry-examples a { color: ${COLORS.teal}; font-weight: 500; text-decoration: none; border-bottom: 1px solid ${COLORS.teal}; cursor: pointer; transition: color 0.2s ease, background 0.2s ease; }
        .industry-examples a:hover { color: ${COLORS.navy}; background: ${COLORS.ice}; padding: 0.1rem 0.3rem; border-radius: 2px; }

        .plain-list { margin: 0.8rem 0 0; padding-left: 1.2rem; color: ${COLORS.slate}; }
        .plain-list li { margin-bottom: 0.5rem; line-height: 1.5; }

        .industry-section h2 { margin-bottom: 1rem; }
        .industry-text { max-width: 680px; margin-bottom: 1rem; }
        .industry-list { max-width: 680px; margin: 0 0 1.2rem; padding-left: 1.3rem; color: ${COLORS.slate}; }
        .industry-list li { margin-bottom: 0.6rem; line-height: 1.55; }
        .faq-item { max-width: 680px; margin-bottom: 1.3rem; }
        .faq-q { margin-bottom: 0.35rem; color: ${COLORS.navy}; }

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
        .footer-cols { display: flex; flex-wrap: wrap; justify-content: space-around; gap: 2rem 1.5rem; width: 100%; }
        .footer-cols > div { flex: 0 1 160px; }
        .footer-cols h3 { font-family: 'Montserrat', sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${COLORS.aqua}; margin-bottom: 0.8rem; }
        .footer-cols a { display: block; background: none; border: none; color: rgba(255,255,255,0.8); font-size: 0.87rem; padding: 0.3rem 0; text-align: left; }
        .footer-cols a:hover { color: ${COLORS.white}; }
        .footer-contact { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 0.3rem; }
        .footer-tagline { text-align: center; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: ${COLORS.aqua}; margin: 0 0 1.2rem; }
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
