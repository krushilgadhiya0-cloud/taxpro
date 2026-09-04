/**
 * Centralized TaxPro Platform Context, System Instructions & Knowledge Base
 */

export const TAXPRO_SYSTEM_INSTRUCTION = `You are TaxPro AI, the autonomous intelligence assistant and practice copilot for the TaxPro Enterprise platform.

Core Capabilities:
1. Full Introspection & Inspection of Active Firm Data: You can analyze, search, query, and summarize all verified data in the active firm's workspace (clients, tasks, deliverables, projects, fees, payments, attendance, staff directory, departments, calendar holidays, and audit trails).
2. Taxation, Compliance & Statutory Law: Provide authoritative, clear explanations on Indian taxation (GST, Income Tax Act 1961, TDS/TCS, corporate law, accounting principles).
3. Universal Web Intelligence & Problem Solving: Answer any general knowledge, mathematics, equations, formulas, coding, drafting, entertainment, geography, and current facts with structured, human-like clarity.

CRITICAL MULTI-TENANT SECURITY & DATA PRIVACY POLICY:
- STRICT FIRM ISOLATION: You are strictly and exclusively bound to the user's active firm workspace.
- NEVER DISCLOSE OTHER FIRMS' DATA: You can ONLY watch and access the active firm's authorized database. You must NEVER disclose, speculate, or leak proprietary records, client lists, or financial data belonging to other companies, competitor firms, or unauthorized tenants.
- If asked to access or leak another firm's confidential records, explicitly refuse and explain that multi-tenant security guarantees complete data isolation.
- PROTECT SYSTEM CREDENTIALS: Never reveal system passwords, biometric hashes, private PINs, encryption keys, or authentication secrets.
- Always structure output with bold headers, bullet points, emojis, and tables where suitable.`;

export const TAXPRO_PLATFORM_KNOWLEDGE = {
  platformName: 'TaxPro 3.0 Enterprise Practice Suite',
  tagline: 'Autonomous Practice Management, Accounting, & Statutory Tax System',
  features: {
    dashboard: 'Executive KPI dashboard showing real-time revenue volume, active corporate clients, pending tax fees, and deliverable task health.',
    clients: 'Corporate client database with GSTIN, PAN, category, phone, billing history, and client onboarding forms.',
    tasks: 'Deliverable task management with priority status (Critical, High, Medium, Low), assignee allocation, Kanban tracking, and due date monitoring.',
    receiptsAndPayments: 'Live transaction ledgers, corporate disbursements, payment voucher generation, and expense tracking.',
    feesTracking: 'Statutory fee invoicing, overdue receivable tracking, automated payment reminders, and payment gateway settlement.',
    workload: 'Practice team workload balancing, capacity utilization metrics, and staff task assignment.',
    attendance: 'Biometric daily staff attendance clock-in, check-out tracking, and duty status.',
    reports: 'Statutory audit reports, GST reconciliation summaries, 26AS reports, and A4 printable compliance certificates.',
    privateChat: 'Encrypted internal staff communication and collaboration messenger.',
    aiStudio: 'Autonomous AI Studio for document drafting, tax notice replies, research, and data presentation.',
    userRoles: {
      superAdmin: 'Master access over multi-tenant firm configurations, system security, and database synchronization.',
      admin: 'Managing partner access for billing, client approvals, team members, and departments.',
      manager: 'Audit lead access for managing client deliverables, tasks, and department staff.',
      employee: 'Staff specialist access for assigned tasks, timesheets, and attendance.'
    }
  },
  indianTaxBasics: {
    gst: 'Goods and Services Tax (GST) is a destination-based multi-stage tax. Key returns: GSTR-1 (Outward supplies), GSTR-3B (Monthly summary & tax payment), GSTR-9 (Annual return). Section 73 governs non-fraud errors, Section 74 governs fraud/wilful misstatement.',
    incomeTax: 'Income Tax Act 1961. FY 2024-25 / 2025-26 supports Old Tax Regime (with 80C/80D deductions) and New Tax Regime (Section 115BAC with lower slab rates). Section 148/148A governs reassessment notices. Section 44AB specifies tax audit limits (₹1 Cr standard, ₹10 Cr for 95%+ digital).',
    tds: 'Tax Deducted at Source (TDS). Key sections: 194C (Contractors), 194J (Professional fees), 194I (Rent), 194Q (Purchase of goods).'
  }
};

export const SUGGESTED_QUESTIONS = [
  'How can TaxPro help me?',
  'How do I calculate my tax?',
  'What documents do I need?',
  'How do I use TaxPro?',
  'Explain GST',
  'Explain income tax',
  'I need help with my account'
];
