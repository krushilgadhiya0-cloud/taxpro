import React, { useState, useEffect, useMemo } from 'react';
import {
  LifeBuoy,
  Search,
  BookOpen,
  HelpCircle,
  Wrench,
  Ticket,
  Bot,
  Bug,
  Lightbulb,
  Shield,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Mail,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  DollarSign,
  UserCheck,
  UploadCloud,
  Send,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Filter,
  User,
  Star,
  Paperclip,
  X,
  Laptop,
  AlertCircle,
  MessageCircle,
  Building,
  Layers,
  ArrowUpRight,
  Lock,
  Headphones,
  CheckCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import { formatDate } from '../../lib/dateUtils';

// ============================================================================
// 1. HELP CATEGORIES CONFIGURATION
// ============================================================================
const HELP_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Sparkles,
    color: 'emerald',
    badge: '4 Guides',
    desc: 'Learn how to set up your workspace, invite team members, and navigate the TaxPro suite.',
    articleCount: 4
  },
  {
    id: 'tax-compliance',
    title: 'Tax & Compliance',
    icon: FileText,
    color: 'indigo',
    badge: '6 Guides',
    desc: 'Find help with GST reconciliation, ITR filing advisory, TDS audits, and compliance calendars.',
    articleCount: 6
  },
  {
    id: 'account-security',
    title: 'Account & Security',
    icon: Shield,
    color: 'purple',
    badge: '5 Guides',
    desc: 'Manage your profile, PIN lock, OTP verification, team roles, and two-factor authentication.',
    articleCount: 5
  },
  {
    id: 'billing-payments',
    title: 'Billing & Payments',
    icon: DollarSign,
    color: 'amber',
    badge: '5 Guides',
    desc: 'Manage firm subscriptions, client retainer billing, cyclic expenses, and Razorpay receipts.',
    articleCount: 5
  },
  {
    id: 'reports-documents',
    title: 'Reports & Documents',
    icon: BookOpen,
    color: 'teal',
    badge: '4 Guides',
    desc: 'Learn how to generate, download, print, and audit financial statements and tax summaries.',
    articleCount: 4
  },
  {
    id: 'technical-support',
    title: 'Technical Support',
    icon: Wrench,
    color: 'rose',
    badge: '6 Guides',
    desc: 'Troubleshoot browser errors, network glitches, WhatsApp/SMTP integrations, and loading issues.',
    articleCount: 6
  }
];

// ============================================================================
// 2. POPULAR KNOWLEDGE BASE ARTICLES
// ============================================================================
const POPULAR_ARTICLES = [
  {
    id: 'art-1',
    title: 'How to get started with TaxPro Practice Suite',
    categoryId: 'getting-started',
    categoryName: 'Getting Started',
    readTime: '3 min read',
    updatedAt: 'Updated 2 days ago',
    summary: 'A step-by-step walkthrough on setting up your firm profile, creating your first client KYC record, and assigning operational projects.',
    content: `
### Overview
TaxPro is an all-in-one Practice Management System engineered for Chartered Accountants, Tax Consultants, and Financial Advisory Firms.

### Step 1: Complete Your Firm Profile
1. Navigate to **Settings** from the sidebar.
2. Enter your registered firm name, GSTIN, PAN, and office address.
3. Upload your official signature and letterhead logo for automated report generation.

### Step 2: Onboard Team Members
1. Go to **Team Members** > click **Add Member / Send Invite**.
2. Define their operational department (*Direct Tax, GST, Audit, or Operations*).
3. Assign granular module permissions to ensure data confidentiality.

### Step 3: Add Clients & Active Retainers
1. Navigate to **Clients** > click **Add Client**.
2. Enter Trade Name, KYC credentials, and monthly billing amount.
3. TaxPro will automatically generate recurring monthly billing cycles in your Financial Ledger.

> **Pro Tip**: You can use the top search bar (Ctrl + K) anywhere in the application to jump directly to any client, project, or task.
    `
  },
  {
    id: 'art-2',
    title: 'How to create your TaxPro account & manage credentials',
    categoryId: 'getting-started',
    categoryName: 'Getting Started',
    readTime: '2 min read',
    updatedAt: 'Updated this week',
    summary: 'Learn how user accounts are provisioned, how passwordless OTP logins work, and how to safeguard authentication.',
    content: `
### Account Creation & Provisioning
- **Super Admins**: Registered upon workspace deployment with master credentials.
- **Managers & Staff**: Invited by administrators with custom generated initial PINs or email verification links.

### Secure Login Methods
1. **Email OTP Authentication**: Enter your registered email to receive an instant 6-digit numeric passcode.
2. **Master Workspace PIN**: Protect sensitive client tax data on shared office computers with a 4-digit lock screen.
3. **Session Auto-Lock**: Configure inactivity auto-locking under **Settings > Security & Permissions**.
    `
  },
  {
    id: 'art-3',
    title: 'How to complete and verify your profile & KYC',
    categoryId: 'account-security',
    categoryName: 'Account & Security',
    readTime: '4 min read',
    updatedAt: 'Updated 5 days ago',
    summary: 'Ensure your account has high trust status by completing your personal avatar, department details, and emergency contact info.',
    content: `
### Profile Completion Checklist
1. **Full Legal Name**: Must match CA/Advocate practitioner registration.
2. **Registered Mobile Number**: Used for SMS alerts and critical password recovery.
3. **Profile Avatar**: Upload a crisp professional photo or select from curated enterprise avatars.
4. **Department Tagging**: Helps workload engines route tax tasks accurately to your desk.
    `
  },
  {
    id: 'art-4',
    title: 'How to manage client tax information, GSTIN & PAN',
    categoryId: 'tax-compliance',
    categoryName: 'Tax & Compliance',
    readTime: '4 min read',
    updatedAt: 'Updated 1 week ago',
    summary: 'Master the Clients & Contact Person module to store GSTINs, PAN numbers, filing passwords, and digital signatures securely.',
    content: `
### Managing Client Compliance Data
1. Navigate to **Clients** in the left navigation.
2. Click on any client row to open their full compliance overview.
3. Under **KYC & Legal Data**, maintain:
   - 15-digit GSTIN (Validated with checksum)
   - 10-character Permanent Account Number (PAN)
   - Portal Login IDs & Encrypted Vault Credentials
   - Associated Contact Persons with designation and mobile numbers.

### Client Status Toggling
- **Active Clients**: Auto-billed every month; visible in active project boards.
- **Old / Archived Clients**: Historical records preserved for audits without generating new recurring fees.
    `
  },
  {
    id: 'art-5',
    title: 'How to generate and export audit & financial reports',
    categoryId: 'reports-documents',
    categoryName: 'Reports & Documents',
    readTime: '3 min read',
    updatedAt: 'Updated 3 days ago',
    summary: 'Generate filtered revenue statements, fee collection ledgers, and attendance timesheets with date, month, and year selectors.',
    content: `
### Exporting Reports
1. Go to **Reports** or click **Print by Date / Month** in **Fees Tracking** or **Receipts & Payments**.
2. Select your desired period:
   - **Specific Day**: Filter for an exact single date statement.
   - **Specific Month**: Full monthly financial reconciliation.
   - **Whole Financial Year**: Annual ledger compilation.
   - **Custom Date Range**: Custom period audit.
3. Choose your export format:
   - **Print / PDF**: Official formatted document with firm letterhead.
   - **CSV / Excel**: Raw ledger for import into Tally, Zoho Books, or Excel.
    `
  },
  {
    id: 'art-6',
    title: 'How to download, share, and sign client documents',
    categoryId: 'reports-documents',
    categoryName: 'Reports & Documents',
    readTime: '2 min read',
    updatedAt: 'Updated 4 days ago',
    summary: 'Seamlessly generate branded payment receipts, salary disbursement slips, and task completion certificates.',
    content: `
### Document Generation Workflow
- **Receipts & Vouchers**: Navigate to **Receipts & Payments**, locate any transaction, and click the **🖨️ Print Receipt** button.
- **Salary Slips**: Go to **Members Payment** > click **Print Salary Slip** for any employee.
- **Watermarking & Branding**: Firm logos and digital signatures configured in Settings are stamped automatically.
    `
  },
  {
    id: 'art-7',
    title: 'How to reset your password and recover account access',
    categoryId: 'account-security',
    categoryName: 'Account & Security',
    readTime: '2 min read',
    updatedAt: 'Updated 1 week ago',
    summary: 'Troubleshoot locked accounts, forgotten workspace PINs, and request administrative master password resets.',
    content: `
### Password & PIN Recovery
1. If locked out from the screen lock, click **Logout** to return to the primary login window.
2. Click **Forgot Password / PIN?** on the sign-in modal.
3. Enter your registered email address to receive a secure recovery link.
4. If your account is suspended or access is revoked, contact your firm Super Admin to reactivate credentials under **Team Members**.
    `
  },
  {
    id: 'art-8',
    title: 'How to verify your account & biometric attendance',
    categoryId: 'account-security',
    categoryName: 'Account & Security',
    readTime: '3 min read',
    updatedAt: 'Updated 6 days ago',
    summary: 'Guidance on daily staff check-ins, automated timesheet logging, and biometric attendance verification.',
    content: `
### Daily Staff Attendance
1. Click **Attendance** from the sidebar or use the top clock-in widget.
2. Select **Check-In** when starting your work shift.
3. TaxPro tracks productive hours, active task contributions, and break durations.
4. Payroll calculations in **Members Payment** automatically correlate with verified attendance days.
    `
  },
  {
    id: 'art-9',
    title: 'How to update account billing & manage cyclic office bills',
    categoryId: 'billing-payments',
    categoryName: 'Billing & Payments',
    readTime: '4 min read',
    updatedAt: 'Updated 2 days ago',
    summary: 'Configure automated recurring monthly expenses like office premises rent, wifi bills, electricity, and SaaS software subscriptions.',
    content: `
### Managing Recurring Cyclic Bills
1. Open **Fees Tracking & Financial Ledger**.
2. Click the **🔄 Cyclic Bills** button in the top header.
3. View or add recurring bill templates (*Office Rent, Electricity, Internet, Cleaning*).
4. Specify the **Due Day** (e.g., 1st or 10th of every month) and amount.
5. TaxPro automatically generates these obligations on the 1st of every month sorted from highest to lowest pending amounts!
    `
  },
  {
    id: 'art-10',
    title: 'How to contact TaxPro Support & response SLA matrix',
    categoryId: 'technical-support',
    categoryName: 'Technical Support',
    readTime: '2 min read',
    updatedAt: 'Updated today',
    summary: 'Get in touch with our certified engineers via live chat, priority support tickets, or direct email routing.',
    content: `
### Support Channels & SLAs
- **Live Ticket System**: Recommended for all inquiries. Average resolution time: **< 2.4 Hours**.
- **Urgent / Production Glitches**: Priority tag ensures **< 15 Minutes** engineer acknowledgment.
- **Dedicated Email**: Write directly to \`support@taxpro.com\` from your registered domain.
- **In-App AI Assistant**: Instant guidance 24/7 for feature lookups and navigation.
    `
  }
];

// ============================================================================
// 3. STRUCTURED FAQ REPOSITORY
// ============================================================================
const FAQS_DATA = [
  {
    category: 'Getting Started',
    items: [
      {
        q: 'What is TaxPro?',
        a: 'TaxPro is a high-performance Practice Management System designed specifically for CA firms, tax practitioners, accountants, and legal advisors. It unifies client KYC, tasks, workload distribution, fees tracking, receipts, staff payroll, and compliance reporting into one unified workspace.'
      },
      {
        q: 'How do I create an account?',
        a: 'New firm accounts are deployed via the master signup portal. Team members and accountants are invited directly by firm administrators via the "Team Members" module with pre-configured access permissions.'
      },
      {
        q: 'How do I get started after signing in?',
        a: 'Start by configuring your firm profile in Settings, creating your active clients in the Clients directory, and setting up recurring billing cycles and cyclic office bills in Fees Tracking.'
      },
      {
        q: 'What features are available in TaxPro?',
        a: 'Key features include Client Directory & KYC, Project & Task Boards, Fees Tracking & Receipts, Recurring Cyclic Bills (Rent/Wifi), Staff Payroll Processing, Biometric Attendance, WhatsApp/SMTP Integrations, Audit Logs, and Instant PDF/CSV Report Generation.'
      }
    ]
  },
  {
    category: 'Account',
    items: [
      {
        q: 'How do I change my email?',
        a: 'Your registered email address serves as your primary authentication key. To update it, your firm Administrator must update your profile in "Team Members" or submit a verification ticket to TaxPro support.'
      },
      {
        q: 'How do I change my phone number?',
        a: 'Click on your avatar in the top-right header, choose "Edit Profile", update your mobile number, and save changes.'
      },
      {
        q: 'How do I reset my password / lock PIN?',
        a: 'Click "Forgot Password" on the login modal or enter your configured Privacy PIN in Settings > Account & Contact Settings. You can also request an admin reset from Team Members.'
      },
      {
        q: 'How does OTP verification work?',
        a: 'When logging in or confirming sensitive changes, a 6-digit one-time password is dispatched to your registered email and SMS gateway with a 10-minute validity window.'
      },
      {
        q: 'How do I delete or archive my account?',
        a: 'Super Admins can deactivate or archive team accounts under Team Members > Access Control. All historical financial audit logs remain preserved for compliance regulations.'
      }
    ]
  },
  {
    category: 'Tax & Compliance',
    items: [
      {
        q: 'How do I add and manage client tax information?',
        a: 'Navigate to Clients > click "Add Client" or edit an existing client. You can store GSTINs, PAN numbers, filing regimes, and digital signature expiry dates.'
      },
      {
        q: 'How do I manage tax records and filing milestones?',
        a: 'Use the Tasks and Projects modules to link GST returns, TDS submissions, and tax audits to specific client records with automated deadline tracking.'
      },
      {
        q: 'How do I generate tax-related compliance reports?',
        a: 'Go to Reports > select your report type (Client Master, GST Filing Status, or Revenue Statements) and choose your specific day, month, or whole financial year.'
      },
      {
        q: 'Where can I find my submitted information and audit trails?',
        a: 'Every create, update, settlement, or print action is permanently recorded in the "Activity Logs" module with actor timestamps and IP metadata.'
      }
    ]
  },
  {
    category: 'Billing',
    items: [
      {
        q: 'How do I view my billing information?',
        a: 'Open "Fees Tracking & Financial Ledger" to view all active client receivables and outgoing cyclic bills sorted by pending amounts.'
      },
      {
        q: 'How do I download an invoice or payment receipt?',
        a: 'Go to "Receipts & Payments", find any completed transaction, and click the Print button to produce a branded PDF invoice/voucher.'
      },
      {
        q: 'How can I manage recurring cyclic office bills (Rent, Wifi, Electricity)?',
        a: 'In Fees Tracking, click the "🔄 Cyclic Bills" button at the top to add, edit, or pause monthly templates that auto-generate on the 1st of every month.'
      },
      {
        q: 'What should I do if a payment was recorded incorrectly?',
        a: 'In Receipts & Payments, click the "↩ (Undo)" arrow next to the transaction. After confirmation, the transaction is reversed and returned to Fees Tracking as pending.'
      }
    ]
  },
  {
    category: 'Security',
    items: [
      {
        q: 'How does TaxPro protect my data?',
        a: 'TaxPro implements bank-grade 256-bit encryption for all client tax credentials, role-based access control (RBAC), and automatic database synchronization with Supabase.'
      },
      {
        q: 'How can I secure my account?',
        a: 'Enable master PIN lock, never share your session credentials, configure strong passwords, and review permissions in Team Members regularly.'
      },
      {
        q: 'What should I do if I suspect unauthorized access?',
        a: 'Super Admins can immediately click "Revoke Access" in Team Members for any suspicious user. This instantly terminates their active session.'
      }
    ]
  },
  {
    category: 'Technical Issues',
    items: [
      {
        q: 'Why is the dashboard not loading or blank?',
        a: 'Ensure you have an active internet connection and that browser cookies/localStorage are enabled. Try a hard refresh (Ctrl + F5 or Cmd + Shift + R).'
      },
      {
        q: 'Why am I not receiving an OTP?',
        a: 'Check your spam/junk email folder, verify your phone number format with +91 country code, and wait 60 seconds before requesting a resend.'
      },
      {
        q: 'Why is a document or report not downloading?',
        a: 'Ensure your browser pop-up blocker is not blocking print dialogs. Click the "Print by Date / Month" button directly from the table header.'
      },
      {
        q: 'What should I do if a feature is not working?',
        a: 'Use our interactive Troubleshooter tab or submit a direct ticket via "Report a Bug". Our engineering team monitors tickets 24/7.'
      }
    ]
  }
];

// ============================================================================
// 4. INTERACTIVE STEP-BY-STEP TROUBLESHOOTING FLOWS
// ============================================================================
const TROUBLESHOOT_FLOWS = [
  {
    id: 'flow-otp',
    title: 'OTP not received via SMS or Email',
    category: 'Authentication',
    desc: 'Resolve one-time password delivery delays when signing in or verifying actions.',
    steps: [
      {
        stepNum: 1,
        title: 'Verify your Phone Number & Email address',
        instruction: 'Double check that your email address is spelled correctly and your phone number includes the appropriate 10-digit Indian format (e.g. 9876543210).'
      },
      {
        stepNum: 2,
        title: 'Check Spam / Junk & Email Filters',
        instruction: 'Automated security OTPs can occasionally land in your Gmail "Promotions" or "Spam" folder. Search your mailbox for "TaxPro Verification Code".'
      },
      {
        stepNum: 3,
        title: 'Check Cellular Network & DND Settings',
        instruction: 'Ensure your mobile phone has active signal bars and that carrier DND (Do Not Disturb) is not blocking high-priority transactional SMS alerts.'
      },
      {
        stepNum: 4,
        title: 'Wait 60 Seconds & Request Resend',
        instruction: 'SMS gateways throttle rapid clicks. Wait for the 60-second countdown timer on the screen to reach zero, then click "Resend Code".'
      },
      {
        stepNum: 5,
        title: 'Still not working? Escalate to Support Desk',
        instruction: 'If the gateway is temporarily experiencing carrier downtime, our support engineers can generate a secure temporary bypass PIN for your account.'
      }
    ]
  },
  {
    id: 'flow-login',
    title: 'Login & Password / PIN Reset Issue',
    category: 'Account Access',
    desc: 'Troubleshoot locked workspaces, incorrect PIN errors, or session expired screens.',
    steps: [
      {
        stepNum: 1,
        title: 'Check Your Configured Privacy PIN',
        instruction: 'Enter your configured workspace privacy lock PIN or your account password. Ensure Caps Lock is off.'
      },
      {
        stepNum: 2,
        title: 'Clear Stale Browser Cache & Local Storage',
        instruction: 'Press Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac) to reload latest security tokens from the server.'
      },
      {
        stepNum: 3,
        title: 'Verify Account Status with Super Admin',
        instruction: 'Ask your firm Super Admin to verify that your profile in "Team Members" is marked as "Active" and not "Access Revoked" or "Suspended".'
      },
      {
        stepNum: 4,
        title: 'Trigger Direct Password Reset',
        instruction: 'Use the "Forgot Password" link on the sign-in screen to receive an encrypted reset link.'
      }
    ]
  },
  {
    id: 'flow-dashboard',
    title: 'Dashboard Not Loading / Network Glitch',
    category: 'Application Performance',
    desc: 'Fix slow loading tables, blank views, or connection timeout messages.',
    steps: [
      {
        stepNum: 1,
        title: 'Check Internet Latency & DNS',
        instruction: 'Verify that your internet connection is active by loading other web pages. High latency on mobile hotspots can delay database hydration.'
      },
      {
        stepNum: 2,
        title: 'Disable Ad-Blockers or Aggressive Script Extensions',
        instruction: 'Certain third-party browser extensions block local API proxies and Supabase WebSocket channels. Try whitelisting TaxPro.'
      },
      {
        stepNum: 3,
        title: 'Check Local Proxy Server Status',
        instruction: 'Ensure the local server backend is running smoothly on port 5000 / 3000.'
      },
      {
        stepNum: 4,
        title: 'Restart Browser Session',
        instruction: 'Close all open TaxPro tabs, open a fresh window, and log back in.'
      }
    ]
  },
  {
    id: 'flow-document',
    title: 'Document or Report Download / Print Failure',
    category: 'Reports & Documents',
    desc: 'Troubleshoot PDF generation, pop-up blockers, or CSV export errors.',
    steps: [
      {
        stepNum: 1,
        title: 'Enable Browser Pop-Ups & Redirects',
        instruction: 'Browsers like Chrome and Edge often block window.print() or auto-download triggers. Look for the blocked pop-up icon in your URL bar.'
      },
      {
        stepNum: 2,
        title: 'Check Date Range Selection',
        instruction: 'Ensure your selected date range contains valid records. If filtering for a specific day with 0 transactions, the report will be empty.'
      },
      {
        stepNum: 3,
        title: 'Switch to CSV / Excel Export',
        instruction: 'If the print dialog is not rendering your firm letterhead, try downloading the raw CSV ledger format.'
      },
      {
        stepNum: 4,
        title: 'Contact Technical Support',
        instruction: 'Submit a ticket with the exact report title and date range for our engineering team to inspect.'
      }
    ]
  },
  {
    id: 'flow-payment',
    title: 'Payment / Subscription Processing Error',
    category: 'Billing & Payments',
    desc: 'Troubleshoot Razorpay gateway drops, bank transfer reconciliation, or cyclic payment issues.',
    steps: [
      {
        stepNum: 1,
        title: 'Verify Bank Account & UPI Status',
        instruction: 'Ensure your bank servers are not undergoing scheduled NEFT/RTGS maintenance.'
      },
      {
        stepNum: 2,
        title: 'Check Transaction Status in Receipts & Payments',
        instruction: 'If funds were deducted, check if the transaction is logged under "Receipts & Payments". If missing, click "Add Ledger Entry" to record reference.'
      },
      {
        stepNum: 3,
        title: 'Use Reversal / Undo Feature if duplicate',
        instruction: 'If a fee was marked as paid accidentally, click the ↩ (Undo) arrow in Receipts & Payments to restore it to Fees Tracking.'
      },
      {
        stepNum: 4,
        title: 'Submit Billing Discrepancy Ticket',
        instruction: 'Include your bank UTR / Reference number in a new support ticket for manual reconciliation.'
      }
    ]
  }
];

// ============================================================================
// 5. DEFAULT / INITIAL SUPPORT TICKETS (SEED DATA)
// ============================================================================
const DEFAULT_TICKETS = [
  {
    id: 'TICK-1042',
    subject: 'Assistance required with GSTR-2B automated reconciliation',
    category: 'Tax & Compliance',
    priority: 'High',
    status: 'In Progress',
    createdAt: '2026-08-22T14:30:00Z',
    updatedAt: '2026-08-23T09:15:00Z',
    assignedTo: 'Rajesh Sharma (Senior Tax Specialist)',
    userEmail: 'ca.sharma@taxpro.com',
    userName: 'CA Rahul Sharma',
    satisfactionRating: 0,
    messages: [
      {
        id: 'msg-1',
        sender: 'user',
        name: 'CA Rahul Sharma',
        avatar: '',
        text: 'Hello team, we are trying to reconcile GSTR-2B purchase data for 12 corporate clients for July 2026. The export report is taking longer than usual on batch sizes above 500 invoices. Can you inspect?',
        time: 'Yesterday at 2:30 PM',
        attachments: []
      },
      {
        id: 'msg-2',
        sender: 'agent',
        name: 'Rajesh Sharma (TaxPro Support)',
        avatar: '',
        text: 'Greetings Rahul Ji! We have optimized the query indexing for high-volume invoice batching. The background worker now processes batches of 2,000+ invoices within 4 seconds. Could you please re-test from your end?',
        time: 'Today at 9:15 AM',
        attachments: []
      }
    ]
  },
  {
    id: 'TICK-1039',
    subject: 'Configuring custom SMTP server for automated client fee reminders',
    category: 'Technical Support',
    priority: 'Medium',
    status: 'Resolved',
    createdAt: '2026-08-20T11:00:00Z',
    updatedAt: '2026-08-21T16:45:00Z',
    assignedTo: 'Priya Patel (Integration Engineer)',
    userEmail: 'accounts@taxpro.com',
    userName: 'Accounts Manager',
    satisfactionRating: 5,
    messages: [
      {
        id: 'msg-1',
        sender: 'user',
        name: 'Accounts Manager',
        avatar: '',
        text: 'We want to connect our firm G-Suite domain (smtp.gmail.com) with App Password for electronic fee reminders. Need port and TLS settings.',
        time: 'Aug 20, 11:00 AM',
        attachments: []
      },
      {
        id: 'msg-2',
        sender: 'agent',
        name: 'Priya Patel (TaxPro Support)',
        avatar: '',
        text: 'Hello! You can configure this directly in "Integrations" > "Email Settings". Use Host: smtp.gmail.com, Port: 587, Secure: TLS. We have verified your connection test.',
        time: 'Aug 21, 4:45 PM',
        attachments: []
      }
    ]
  },
  {
    id: 'TICK-1035',
    subject: 'Requesting clarification on Cyclic Office Rent auto-generation',
    category: 'Billing & Payments',
    priority: 'Low',
    status: 'Resolved',
    createdAt: '2026-08-18T10:00:00Z',
    updatedAt: '2026-08-19T12:00:00Z',
    assignedTo: 'Ananya Verma (Billing Lead)',
    userEmail: 'admin@taxpro.com',
    userName: 'Firm Administrator',
    satisfactionRating: 5,
    messages: [
      {
        id: 'msg-1',
        sender: 'user',
        name: 'Firm Administrator',
        avatar: '',
        text: 'Does the Cyclic Bills manager in Fees Tracking auto-generate rent for the new month automatically on the 1st day?',
        time: 'Aug 18, 10:00 AM',
        attachments: []
      },
      {
        id: 'msg-2',
        sender: 'agent',
        name: 'Ananya Verma (TaxPro Support)',
        avatar: '',
        text: 'Yes! All active cyclic templates (Office Rent, Wifi, Electricity) automatically generate in your pending ledger on the 1st of every month sorted from highest to lowest pending amounts.',
        time: 'Aug 19, 12:00 PM',
        attachments: []
      }
    ]
  }
];

export default function SupportHelpView({ onShowToast }) {
  // Navigation Sub-tab: 'home', 'articles', 'faqs', 'troubleshoot', 'tickets', 'admin', 'bug', 'feature'
  const [activeTab, setActiveTab] = useState('home');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState(null);

  // FAQ Expand state
  const [expandedFaqs, setExpandedFaqs] = useState({});
  const [faqFeedback, setFaqFeedback] = useState({});

  // Troubleshooting State
  const [activeFlowId, setActiveFlowId] = useState('flow-otp');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState({});

  // Tickets State
  const [tickets, setTickets] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_support_tickets');
      return saved ? JSON.parse(saved) : DEFAULT_TICKETS;
    } catch (e) {
      return DEFAULT_TICKETS;
    }
  });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'Technical Support',
    priority: 'Medium',
    description: '',
    attachmentName: ''
  });

  // Admin Dashboard State
  const [adminStatusFilter, setAdminStatusFilter] = useState('All');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('All');
  const [adminPriorityFilter, setAdminPriorityFilter] = useState('All');
  const [internalNoteText, setInternalNoteText] = useState('');

  // Bug Report & Feature Request State
  const [bugForm, setBugForm] = useState({
    title: '',
    category: 'UI / Display Glitch',
    description: '',
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: '',
    priority: 'Medium',
    browser: `${navigator.userAgent.includes('Chrome') ? 'Google Chrome' : 'Modern Web Browser'} (${navigator.platform || 'Windows'})`,
    attachmentName: ''
  });

  const [featureForm, setFeatureForm] = useState({
    featureName: '',
    category: 'Practice Automation',
    description: '',
    whyNeeded: '',
    expectedBenefit: '',
    attachmentName: ''
  });

  // Floating AI Assistant State
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([
    {
      id: 'ai-init',
      sender: 'ai',
      text: 'Hello! I am your TaxPro Support AI Assistant. How can I help you navigate features, manage client KYC, configure cyclic billing, or resolve technical issues today?',
      time: 'Just now',
      copied: false,
      helpful: null
    }
  ]);
  const [isAITyping, setIsAITyping] = useState(false);

  // Sync tickets to localStorage & Supabase
  useEffect(() => {
    try {
      localStorage.setItem('taxpro_support_tickets', JSON.stringify(tickets));
    } catch (e) {}
  }, [tickets]);

  // Handle live search suggestions
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();

    const matchedArticles = POPULAR_ARTICLES.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.summary.toLowerCase().includes(q) || 
      a.categoryName.toLowerCase().includes(q)
    );

    const matchedFaqs = [];
    FAQS_DATA.forEach(cat => {
      cat.items.forEach(item => {
        if (item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)) {
          matchedFaqs.push({ ...item, category: cat.category });
        }
      });
    });

    const matchedFlows = TROUBLESHOOT_FLOWS.filter(f => 
      f.title.toLowerCase().includes(q) || 
      f.desc.toLowerCase().includes(q)
    );

    return {
      articles: matchedArticles,
      faqs: matchedFaqs,
      flows: matchedFlows,
      total: matchedArticles.length + matchedFaqs.length + matchedFlows.length
    };
  }, [searchQuery]);

  // Toggle FAQ Accordion
  const toggleFaq = (key) => {
    setExpandedFaqs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Submit Ticket Creation
  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      if (onShowToast) onShowToast('Please provide a subject and detailed description.', 'error');
      return;
    }

    const ticketId = `TICK-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdDate = new Date().toISOString();

    const createdRecord = {
      id: ticketId,
      subject: newTicket.subject.trim(),
      category: newTicket.category,
      priority: newTicket.priority,
      status: 'Open',
      createdAt: createdDate,
      updatedAt: createdDate,
      assignedTo: 'Unassigned (In Triage)',
      userEmail: 'user@taxpro.com',
      userName: 'Current TaxPro User',
      satisfactionRating: 0,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'user',
          name: 'Current TaxPro User',
          avatar: '',
          text: newTicket.description.trim(),
          time: 'Just now',
          attachments: newTicket.attachmentName ? [newTicket.attachmentName] : []
        }
      ]
    };

    const updated = [createdRecord, ...tickets];
    setTickets(updated);

    logAuditActivity({
      action: 'CREATE_TICKET',
      module: 'Support & Help',
      details: `Created Support Ticket "${createdRecord.subject}" (${createdRecord.id}) with Priority: ${createdRecord.priority}`,
      metadata: { ticketId, subject: createdRecord.subject, priority: createdRecord.priority }
    });

    setIsCreateTicketModalOpen(false);
    setNewTicket({
      subject: '',
      category: 'Technical Support',
      priority: 'Medium',
      description: '',
      attachmentName: ''
    });

    if (onShowToast) onShowToast(`✓ Support Ticket #${ticketId} submitted successfully! Expected response < 15 mins.`, 'success');
  };

  // Reply to Ticket
  const handleSendTicketReply = () => {
    if (!ticketReplyText.trim() || !selectedTicket) return;

    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      name: 'Current TaxPro User',
      avatar: '',
      text: ticketReplyText.trim(),
      time: 'Just now',
      attachments: []
    };

    const updatedTickets = tickets.map(t => {
      if (t.id === selectedTicket.id) {
        const updatedMsgs = [...t.messages, newMessage];
        return {
          ...t,
          status: t.status === 'Resolved' || t.status === 'Closed' ? 'In Progress' : t.status,
          updatedAt: new Date().toISOString(),
          messages: updatedMsgs
        };
      }
      return t;
    });

    setTickets(updatedTickets);
    setSelectedTicket(prev => prev ? {
      ...prev,
      updatedAt: new Date().toISOString(),
      messages: [...prev.messages, newMessage]
    } : null);

    setTicketReplyText('');

    logAuditActivity({
      action: 'REPLY_TICKET',
      module: 'Support & Help',
      details: `Posted reply on Support Ticket #${selectedTicket.id}`,
      metadata: { ticketId: selectedTicket.id }
    });

    if (onShowToast) onShowToast('✓ Response posted to support thread.', 'success');

    // Simulate Agent Auto-Acknowledgment
    setTimeout(() => {
      const autoAck = {
        id: `msg-ack-${Date.now()}`,
        sender: 'agent',
        name: selectedTicket.assignedTo.includes('(') ? selectedTicket.assignedTo : 'TaxPro Support Specialist',
        avatar: '',
        text: 'Thank you for the update! Our engineering and compliance desk is reviewing this. We will get back to you shortly.',
        time: 'Just now',
        attachments: []
      };

      setTickets(curr => curr.map(t => {
        if (t.id === selectedTicket.id) {
          return {
            ...t,
            updatedAt: new Date().toISOString(),
            messages: [...t.messages, autoAck]
          };
        }
        return t;
      }));

      setSelectedTicket(prev => prev ? {
        ...prev,
        updatedAt: new Date().toISOString(),
        messages: [...prev.messages, autoAck]
      } : null);
    }, 2000);
  };

  // Close Ticket & Rate
  const handleCloseTicket = (ticketId) => {
    const updated = tickets.map(t => t.id === ticketId ? { ...t, status: 'Resolved', updatedAt: new Date().toISOString() } : t);
    setTickets(updated);
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: 'Resolved', updatedAt: new Date().toISOString() } : null);
    }
    if (onShowToast) onShowToast(`✓ Ticket #${ticketId} marked as Resolved.`, 'info');
  };

  // Rate Ticket
  const handleRateTicket = (ticketId, rating) => {
    const updated = tickets.map(t => t.id === ticketId ? { ...t, satisfactionRating: rating } : t);
    setTickets(updated);
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, satisfactionRating: rating } : null);
    }
    if (onShowToast) onShowToast(`✓ Thank you for rating support ${rating} / 5 Stars!`, 'success');
  };

  // Admin Change Status / Assignee
  const handleAdminUpdateTicket = (ticketId, newStatus, newAssignee) => {
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: newStatus || t.status,
          assignedTo: newAssignee || t.assignedTo,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    setTickets(updated);
    if (onShowToast) onShowToast(`✓ Ticket #${ticketId} updated successfully.`, 'success');
  };

  // Bug Form Submit
  const handleBugSubmit = (e) => {
    e.preventDefault();
    if (!bugForm.title.trim() || !bugForm.description.trim()) {
      if (onShowToast) onShowToast('Please provide an issue title and description.', 'error');
      return;
    }

    logAuditActivity({
      action: 'REPORT_BUG',
      module: 'Support & Help',
      details: `Reported technical bug: "${bugForm.title}" (${bugForm.category})`,
      metadata: { ...bugForm }
    });

    if (onShowToast) onShowToast('✓ Bug report submitted! Technical diagnostics sent to engineering.', 'success');
    setBugForm({
      title: '',
      category: 'UI / Display Glitch',
      description: '',
      stepsToReproduce: '',
      expectedResult: '',
      actualResult: '',
      priority: 'Medium',
      browser: `${navigator.userAgent.includes('Chrome') ? 'Google Chrome' : 'Modern Web Browser'} (${navigator.platform || 'Windows'})`,
      attachmentName: ''
    });
    setActiveTab('home');
  };

  // Feature Request Submit
  const handleFeatureSubmit = (e) => {
    e.preventDefault();
    if (!featureForm.featureName.trim() || !featureForm.description.trim()) {
      if (onShowToast) onShowToast('Please enter a feature name and description.', 'error');
      return;
    }

    logAuditActivity({
      action: 'FEATURE_REQUEST',
      module: 'Support & Help',
      details: `Submitted Feature Idea: "${featureForm.featureName}" (${featureForm.category})`,
      metadata: { ...featureForm }
    });

    if (onShowToast) onShowToast('Thanks! Your idea has been sent to the TaxPro team.', 'success');
    setFeatureForm({
      featureName: '',
      category: 'Practice Automation',
      description: '',
      whyNeeded: '',
      expectedBenefit: '',
      attachmentName: ''
    });
    setActiveTab('home');
  };

  // AI Chat Send Message
  const handleSendAIMessage = () => {
    if (!aiInput.trim()) return;

    const userText = aiInput.trim();
    const userMsg = {
      id: `ai-user-${Date.now()}`,
      sender: 'user',
      text: userText,
      time: 'Just now'
    };

    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setIsAITyping(true);

    setTimeout(() => {
      let reply = '';
      const q = userText.toLowerCase();

      if (q.includes('otp') || q.includes('verification') || q.includes('code')) {
        reply = 'For OTP delays: Check that your mobile number format is valid (+91), check spam/promotions in your email, wait 60 seconds for network clearing, and retry. You can also view our step-by-step OTP Troubleshooter under the Troubleshooting tab.';
      } else if (q.includes('fee') || q.includes('client') || q.includes('retainer') || q.includes('billing')) {
        reply = 'Client Retainer Fees are tracked in "Fees Tracking & Financial Ledger". Fees are sorted from highest to lowest pending amounts. When marked as paid, transactions automatically transfer to "Receipts & Payments" and clear from active dues!';
      } else if (q.includes('cyclic') || q.includes('rent') || q.includes('electricity') || q.includes('wifi')) {
        reply = 'Monthly recurring expenses like Office Rent, Wifi, and Electricity are managed via "🔄 Cyclic Bills" in Fees Tracking. They automatically generate on the 1st of every month with your specified due day.';
      } else if (q.includes('salary') || q.includes('payroll') || q.includes('staff')) {
        reply = 'Staff salaries and monthly payroll disbursements are managed in "Members Payment" and recorded directly in Receipts & Payments upon payout.';
      } else if (q.includes('report') || q.includes('print') || q.includes('export') || q.includes('csv')) {
        reply = 'You can print or export ledgers by Specific Day, Specific Month, Whole Year, or Date Range using the "Print by Date / Month" button in Fees Tracking, Receipts, or Reports.';
      } else if (q.includes('undo') || q.includes('reverse') || q.includes('return')) {
        reply = 'To return a settled transaction from Receipts & Payments back to Fees Tracking as pending, click the amber "↩ (Undo)" arrow in the Receipts table and confirm.';
      } else {
        reply = `I couldn't find a direct answer for "${userText}". Would you like to create a formal support ticket so our senior engineers can assist you directly?`;
      }

      setIsAITyping(false);
      setAiMessages(prev => [
        ...prev,
        {
          id: `ai-resp-${Date.now()}`,
          sender: 'ai',
          text: reply,
          time: 'Just now',
          copied: false,
          helpful: null,
          canEscalate: reply.includes('support ticket')
        }
      ]);
    }, 900);
  };

  // Copy AI response
  const handleCopyAIResponse = (msgId, text) => {
    navigator.clipboard.writeText(text);
    setAiMessages(prev => prev.map(m => m.id === msgId ? { ...m, copied: true } : m));
    setTimeout(() => {
      setAiMessages(prev => prev.map(m => m.id === msgId ? { ...m, copied: false } : m));
    }, 2000);
  };

  // Rate AI response
  const handleRateAIResponse = (msgId, isHelpful) => {
    setAiMessages(prev => prev.map(m => m.id === msgId ? { ...m, helpful: isHelpful } : m));
    if (onShowToast) onShowToast(isHelpful ? '✓ Thanks for the feedback!' : '✓ Feedback noted. Consider creating a ticket for complex queries.', 'info');
  };

  // Active Troubleshooter Flow
  const currentFlow = useMemo(() => {
    return TROUBLESHOOT_FLOWS.find(f => f.id === activeFlowId) || TROUBLESHOOT_FLOWS[0];
  }, [activeFlowId]);

  return (
    <div className="p-3 sm:p-5 lg:p-6 bg-[#f3f4f6] min-h-screen text-gray-800 relative">
      
      {/* ========================================================================= */}
      {/* 🌟 HERO & SMART SEARCH HEADER                                            */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-gradient-to-r from-[#161722] via-[#24263e] to-[#161722] text-white p-6 sm:p-8 lg:p-10 mb-6 shadow-xl relative overflow-hidden border border-gray-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-teal-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>TaxPro Customer Support & Knowledge Center</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-outfit text-white tracking-tight mb-2">
            Hi, how can we help?
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 font-medium mb-6 max-w-xl mx-auto">
            Find answers, explore practice guides, follow interactive troubleshooting, or connect with our specialized CA support desk.
          </p>

          {/* LARGE SMART SEARCH BAR */}
          <div className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center shadow-2xl rounded-2xl bg-white/95 backdrop-blur-md border border-white/40 focus-within:ring-4 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all">
              <Search className="w-5 h-5 text-gray-400 ml-4.5 shrink-0" />
              <input
                type="text"
                placeholder="Search for help, guides, tax features, billing, account issues, OTP..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-3.5 text-xs sm:text-sm font-semibold text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mr-3 p-1 rounded-lg text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* QUICK SUGGESTION CHIPS */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap mt-3 text-[11px] text-gray-300">
              <span className="text-gray-400 font-medium">Popular searches:</span>
              {[
                'OTP not coming',
                'Cyclic Rent Bill',
                'GST Reports Export',
                'Add Client Fee',
                'Reverse Payment'
              ].map(chip => (
                <button
                  key={chip}
                  onClick={() => setSearchQuery(chip)}
                  className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-teal-200 border border-white/10 transition-all cursor-pointer font-semibold"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🔍 LIVE SMART SEARCH RESULTS OVERLAY (IF SEARCHING)                      */}
      {/* ========================================================================= */}
      {searchQuery && searchResults && (
        <div className="bg-white rounded-3xl p-6 mb-6 border border-indigo-100 shadow-xl animate-page-fade">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div>
              <h3 className="text-base font-black font-outfit text-gray-900">
                Search Results for "{searchQuery}"
              </h3>
              <p className="text-xs text-gray-500">Found {searchResults.total} matches across Guides, FAQs, and Troubleshooters</p>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Clear Search
            </button>
          </div>

          {searchResults.total === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h4 className="text-sm font-extrabold text-gray-800">No results found?</h4>
              <p className="text-xs text-gray-500 mt-1 mb-4">We couldn't find anything matching your search query.</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Browse Help Center
                </button>
                <button
                  onClick={() => setIsCreateTicketModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#5b52e0] hover:bg-[#4c44cf] text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Create a Support Ticket
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.articles.map(art => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="p-4 rounded-2xl border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all bg-white cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                      {art.categoryName}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">{art.readTime}</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {art.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {art.summary}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                    <span>Read Article</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}

              {searchResults.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveTab('faqs');
                    setExpandedFaqs(prev => ({ ...prev, [`faq-${faq.category}-${idx}`]: true }));
                  }}
                  className="p-4 rounded-2xl border border-gray-200 hover:border-teal-400 hover:shadow-md transition-all bg-white cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[10px] font-bold">
                      FAQ • {faq.category}
                    </span>
                  </div>
                  <h4 className="text-xs font-extrabold text-gray-900 group-hover:text-teal-700 transition-colors line-clamp-2">
                    {faq.q}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {faq.a}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-teal-700">
                    <span>View in FAQs</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🧭 NAVIGATION SUB-TABS TOOLBAR                                            */}
      {/* ========================================================================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-2 mb-6 shadow-2xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'home', label: 'Help Center', icon: LifeBuoy },
            { id: 'articles', label: 'Popular Help Guides', icon: BookOpen },
            { id: 'faqs', label: 'FAQs', icon: HelpCircle },
            { id: 'troubleshoot', label: 'Troubleshooter', icon: Wrench },
            { id: 'tickets', label: `My Tickets (${tickets.length})`, icon: Ticket },
            { id: 'admin', label: 'Support Dashboard', icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#5b52e0] text-white shadow-md shadow-indigo-600/20'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('bug')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'bug' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Report a Bug</span>
          </button>

          <button
            onClick={() => setActiveTab('feature')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'feature' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Request Feature</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🏠 TAB 1: SUPPORT CENTER HOMEPAGE (DEFAULT VIEW)                         */}
      {/* ========================================================================= */}
      {activeTab === 'home' && (
        <div className="space-y-8 animate-page-fade">
          
          {/* 6 QUICK ACTION CATEGORY CARDS */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black font-outfit text-gray-900">Explore by Category</h2>
                <p className="text-xs text-gray-500">Quick guides tailored to every module in the TaxPro suite</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {HELP_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.title);
                      setActiveTab('articles');
                    }}
                    className="p-5 rounded-3xl bg-white border border-gray-200 hover:border-indigo-400 hover:shadow-lg transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
                          cat.color === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
                          cat.color === 'indigo' ? 'bg-indigo-50 text-indigo-700' :
                          cat.color === 'purple' ? 'bg-purple-50 text-purple-700' :
                          cat.color === 'amber' ? 'bg-amber-50 text-amber-700' :
                          cat.color === 'teal' ? 'bg-teal-50 text-teal-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[10px] font-extrabold uppercase tracking-wider">
                          {cat.badge}
                        </span>
                      </div>

                      <h3 className="text-sm font-extrabold font-outfit text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {cat.title}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>

                    <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                      <span>Explore Guides</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* POPULAR HELP ARTICLES SECTION */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black font-outfit text-gray-900">Popular Help Guides</h2>
                <p className="text-xs text-gray-500">Most frequently referenced documentation by practitioners</p>
              </div>
              <button
                onClick={() => setActiveTab('articles')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
              >
                <span>View All 10 Guides</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {POPULAR_ARTICLES.slice(0, 6).map(art => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="p-5 rounded-3xl bg-white border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                        {art.categoryName}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">{art.readTime}</span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {art.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {art.summary}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-400 group-hover:text-indigo-600 transition-colors">
                    <span>{art.updatedAt}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INTERACTIVE TROUBLESHOOTING PROMO BANNER */}
          <div className="rounded-3xl bg-gradient-to-r from-teal-900 via-indigo-950 to-teal-900 text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-teal-800">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Wrench className="w-3.5 h-3.5" />
                <span>Interactive Troubleshooter</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-outfit text-white">
                Experiencing OTP, Login or Download Issues?
              </h3>
              <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                Step-by-step diagnostic workflows designed to resolve platform errors in minutes without waiting for support response.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('troubleshoot')}
              className="px-6 py-3 rounded-2xl bg-teal-400 hover:bg-teal-300 text-teal-950 font-black text-xs shadow-lg transition-all active:scale-98 cursor-pointer shrink-0 flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              <span>Launch Troubleshooter</span>
            </button>
          </div>

          {/* "STILL NEED HELP?" CONTACT HUB */}
          <div>
            <div className="text-center max-w-lg mx-auto mb-6">
              <h2 className="text-xl font-black font-outfit text-gray-900">Still need help?</h2>
              <p className="text-xs text-gray-500 mt-1">Our dedicated compliance & engineering support team is here for you</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Contact Support */}
              <div className="p-5 rounded-3xl bg-white border border-gray-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-extrabold text-gray-900">Open a Ticket</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Submit detailed issue with attachments.</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> SLA Response &lt; 15 mins
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateTicketModalOpen(true)}
                  className="w-full mt-4 py-2 bg-[#5b52e0] hover:bg-[#4c44cf] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Create Ticket
                </button>
              </div>

              {/* Email Support */}
              <div className="p-5 rounded-3xl bg-white border border-gray-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                    <Mail className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-extrabold text-gray-900">Email Desk</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Direct confidential routing to team.</p>
                  <p className="text-[10px] font-mono text-gray-400 font-semibold mt-2">support@taxpro.com</p>
                </div>
                <a
                  href="mailto:support@taxpro.com"
                  className="w-full mt-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold text-center block transition-all"
                >
                  Send Email
                </a>
              </div>

              {/* Live AI Assistant */}
              <div className="p-5 rounded-3xl bg-white border border-gray-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                    <Bot className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-extrabold text-gray-900">TaxPro AI Bot</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Instant 24/7 feature & workflow lookups.</p>
                  <p className="text-[10px] text-purple-600 font-bold mt-2">Instantaneous</p>
                </div>
                <button
                  onClick={() => setIsAIChatOpen(true)}
                  className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Chat with AI
                </button>
              </div>

              {/* Report Bug */}
              <div className="p-5 rounded-3xl bg-white border border-gray-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                    <Bug className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-extrabold text-gray-900">Report a Bug</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Submit technical diagnostics to dev team.</p>
                  <p className="text-[10px] text-rose-600 font-bold mt-2">Direct Dev Triage</p>
                </div>
                <button
                  onClick={() => setActiveTab('bug')}
                  className="w-full mt-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Report Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📚 TAB 2: POPULAR HELP GUIDES REPOSITORY                                 */}
      {/* ========================================================================= */}
      {activeTab === 'articles' && (
        <div className="space-y-6 animate-page-fade">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black font-outfit text-gray-900">Knowledge Base Articles</h2>
              <p className="text-xs text-gray-500">Comprehensive documentation for setting up, managing, and automating your tax practice</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['All', 'Getting Started', 'Tax & Compliance', 'Account & Security', 'Billing & Payments', 'Reports & Documents', 'Technical Support'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#5b52e0] text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {POPULAR_ARTICLES
              .filter(a => selectedCategory === 'All' || a.categoryName === selectedCategory)
              .map(art => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="p-5 rounded-3xl bg-white border border-gray-200 hover:border-indigo-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider">
                        {art.categoryName}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {art.readTime}
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors leading-snug">
                      {art.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                      {art.summary}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                    <span className="text-[11px] text-gray-400 font-medium">{art.updatedAt}</span>
                    <div className="flex items-center gap-1">
                      <span>Read Guide</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ❓ TAB 3: MODERN ACCORDION FAQ REPOSITORY                                 */}
      {/* ========================================================================= */}
      {activeTab === 'faqs' && (
        <div className="space-y-6 animate-page-fade">
          <div className="text-center max-w-xl mx-auto mb-4">
            <h2 className="text-2xl font-black font-outfit text-gray-900">Frequently Asked Questions</h2>
            <p className="text-xs text-gray-500 mt-1">Quick answers to common questions about features, accounts, billing, and compliance</p>
          </div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {FAQS_DATA.map((cat, catIdx) => (
              <div key={catIdx} className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                    {catIdx + 1}
                  </div>
                  <h3 className="text-base font-black font-outfit text-gray-900">{cat.category}</h3>
                </div>

                <div className="divide-y divide-gray-100">
                  {cat.items.map((item, itemIdx) => {
                    const faqKey = `faq-${cat.category}-${itemIdx}`;
                    const isExpanded = !!expandedFaqs[faqKey];
                    const feedback = faqFeedback[faqKey];

                    return (
                      <div key={itemIdx} className="py-3.5">
                        <button
                          onClick={() => toggleFaq(faqKey)}
                          className="w-full flex items-center justify-between text-left gap-4 text-xs sm:text-sm font-extrabold text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <span>{item.q}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180 text-indigo-600' : ''}`} />
                        </button>

                        {isExpanded && (
                          <div className="pt-2.5 pl-1 text-xs text-gray-600 leading-relaxed font-medium animate-fadeIn">
                            <p>{item.a}</p>
                            
                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-50 text-[11px] text-gray-400">
                              <span>Was this answer helpful?</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setFaqFeedback(prev => ({ ...prev, [faqKey]: 'yes' }));
                                    if (onShowToast) onShowToast('Thanks for your feedback!', 'success');
                                  }}
                                  className={`px-2 py-0.5 rounded-md border flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-all ${
                                    feedback === 'yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  <ThumbsUp className="w-3 h-3" /> Yes
                                </button>
                                <button
                                  onClick={() => {
                                    setFaqFeedback(prev => ({ ...prev, [faqKey]: 'no' }));
                                    if (onShowToast) onShowToast('Feedback noted. We will expand this guide.', 'info');
                                  }}
                                  className={`px-2 py-0.5 rounded-md border flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-all ${
                                    feedback === 'no' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  <ThumbsDown className="w-3 h-3" /> No
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔧 TAB 4: INTERACTIVE STEP-BY-STEP TROUBLESHOOTER                        */}
      {/* ========================================================================= */}
      {activeTab === 'troubleshoot' && (
        <div className="space-y-6 animate-page-fade max-w-5xl mx-auto">
          <div>
            <h2 className="text-xl font-black font-outfit text-gray-900">Interactive Troubleshooting System</h2>
            <p className="text-xs text-gray-500">Select your specific issue to begin an interactive step-by-step diagnostic resolution</p>
          </div>

          {/* Topic Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TROUBLESHOOT_FLOWS.map(flow => {
              const isSelected = flow.id === activeFlowId;
              return (
                <button
                  key={flow.id}
                  onClick={() => {
                    setActiveFlowId(flow.id);
                    setCurrentStepIndex(0);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-900 to-gray-900 text-white border-indigo-700 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-white text-gray-800 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                  }`}
                >
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isSelected ? 'bg-white/20 text-teal-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {flow.category}
                    </span>
                    <h4 className={`text-xs font-extrabold mt-2 leading-snug ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {flow.title}
                    </h4>
                  </div>
                  <div className={`mt-3 flex items-center justify-between text-[11px] font-bold ${
                    isSelected ? 'text-teal-300' : 'text-indigo-600'
                  }`}>
                    <span>{flow.steps.length} Diagnostic Steps</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* ACTIVE STEP CARD */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                  Troubleshooting Guide • {currentFlow.category}
                </span>
                <h3 className="text-lg font-black font-outfit text-gray-900 mt-0.5">
                  {currentFlow.title}
                </h3>
              </div>
              <div className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black">
                Step {currentStepIndex + 1} of {currentFlow.steps.length}
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-5 gap-1.5 mb-6">
              {currentFlow.steps.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'bg-[#5b52e0]'
                      : idx < currentStepIndex || completedSteps[`${currentFlow.id}-${idx}`]
                      ? 'bg-emerald-500'
                      : 'bg-gray-200'
                  }`}
                  title={`Step ${idx + 1}: ${s.title}`}
                />
              ))}
            </div>

            {/* Current Step Instruction Box */}
            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  {currentStepIndex + 1}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900">
                    {currentFlow.steps[currentStepIndex].title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed font-medium">
                    {currentFlow.steps[currentStepIndex].instruction}
                  </p>
                </div>
              </div>
            </div>

            {/* Step Checkbox */}
            <label className="flex items-center gap-2.5 text-xs font-bold text-gray-800 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors mb-6">
              <input
                type="checkbox"
                checked={!!completedSteps[`${currentFlow.id}-${currentStepIndex}`]}
                onChange={e => setCompletedSteps(prev => ({
                  ...prev,
                  [`${currentFlow.id}-${currentStepIndex}`]: e.target.checked
                }))}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>I have checked and followed this step</span>
            </label>

            {/* Next / Previous & Escalation Controls */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-gray-100">
              <button
                disabled={currentStepIndex === 0}
                onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Previous Step
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setNewTicket({
                      subject: `Unresolved: ${currentFlow.title}`,
                      category: 'Technical Support',
                      priority: 'High',
                      description: `Followed automated troubleshooting steps for "${currentFlow.title}". Problem is still persisting at Step ${currentStepIndex + 1} (${currentFlow.steps[currentStepIndex].title}). Please investigate.`,
                      attachmentName: ''
                    });
                    setIsCreateTicketModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Still Not Fixed? Open Ticket</span>
                </button>

                {currentStepIndex < currentFlow.steps.length - 1 ? (
                  <button
                    onClick={() => setCurrentStepIndex(prev => Math.min(currentFlow.steps.length - 1, prev + 1))}
                    className="px-5 py-2 rounded-xl bg-[#5b52e0] hover:bg-[#4c44cf] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (onShowToast) onShowToast('✓ Troubleshooting workflow completed! Let us know if you need further help.', 'success');
                      setActiveTab('home');
                    }}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Finish Troubleshooting</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎫 TAB 5: MY SUPPORT TICKETS DASHBOARD & CONVERSATION VIEW              */}
      {/* ========================================================================= */}
      {activeTab === 'tickets' && (
        <div className="space-y-6 animate-page-fade">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black font-outfit text-gray-900">My Support Requests</h2>
              <p className="text-xs text-gray-500">Track and respond to your open tickets with TaxPro engineers</p>
            </div>

            <button
              onClick={() => setIsCreateTicketModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#5b52e0] hover:bg-[#4c44cf] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Ticket</span>
            </button>
          </div>

          {/* Ticket Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Ticket ID</th>
                    <th className="p-4">Subject & Description</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Created / Updated</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {tickets.map(ticket => (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                        {ticket.id}
                      </td>
                      <td className="p-4 max-w-xs sm:max-w-md">
                        <div className="font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {ticket.subject}
                        </div>
                        <div className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 font-normal">
                          {ticket.messages[ticket.messages.length - 1]?.text || 'No message history'}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap text-gray-700 font-bold">
                        {ticket.category}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          ticket.priority === 'Urgent' ? 'bg-red-50 text-red-700 border border-red-200' :
                          ticket.priority === 'High' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          ticket.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit ${
                          ticket.status === 'Open' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          ticket.status === 'In Progress' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          ticket.status === 'Waiting for User' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            ticket.status === 'Open' ? 'bg-blue-600' :
                            ticket.status === 'In Progress' ? 'bg-purple-600' :
                            ticket.status === 'Waiting for User' ? 'bg-amber-600' :
                            'bg-emerald-600'
                          }`}></span>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-gray-400 text-[11px]">
                        <div>{formatDate(ticket.createdAt)}</div>
                        <div className="text-[10px] text-gray-400">{ticket.messages.length} messages</div>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-[#5b52e0] hover:text-white text-gray-700 font-bold text-xs transition-all cursor-pointer"
                        >
                          View Thread
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🛠️ TAB 6: ADMIN SUPPORT MANAGEMENT DASHBOARD                            */}
      {/* ========================================================================= */}
      {activeTab === 'admin' && (
        <div className="space-y-6 animate-page-fade">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3 h-3" /> Master Support Triage Desk
              </div>
              <h2 className="text-xl font-black font-outfit text-gray-900">Admin Support Management</h2>
              <p className="text-xs text-gray-500">Monitor firm customer inquiries, assign engineers, and review resolution SLAs</p>
            </div>
          </div>

          {/* REAL-TIME ANALYTICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Total Inquiries</span>
              <span className="text-2xl font-black font-outfit text-gray-900 mt-1 block">{tickets.length}</span>
              <span className="text-[10px] text-gray-500">All registered tickets</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
              <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">Open Tickets</span>
              <span className="text-2xl font-black font-outfit text-blue-600 mt-1 block">
                {tickets.filter(t => t.status === 'Open').length}
              </span>
              <span className="text-[10px] text-blue-700 font-semibold">Requires triage</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
              <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block">In Progress</span>
              <span className="text-2xl font-black font-outfit text-purple-600 mt-1 block">
                {tickets.filter(t => t.status === 'In Progress').length}
              </span>
              <span className="text-[10px] text-purple-700 font-semibold">Under active review</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">Resolved</span>
              <span className="text-2xl font-black font-outfit text-emerald-600 mt-1 block">
                {tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">Completed tickets</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
              <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider block">Avg SLA Time</span>
              <span className="text-2xl font-black font-outfit text-amber-600 mt-1 block">2.4h</span>
              <span className="text-[10px] text-gray-500">Resolution velocity</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Satisfaction</span>
              <span className="text-2xl font-black font-outfit text-indigo-600 mt-1 block flex items-center gap-1">
                4.9 <Star className="w-4 h-4 fill-amber-400 text-amber-400 inline" />
              </span>
              <span className="text-[10px] text-gray-500">Based on user ratings</span>
            </div>
          </div>

          {/* ADMIN FILTER TOOLBAR */}
          <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-500">Filter By:</span>
              <select
                value={adminStatusFilter}
                onChange={e => setAdminStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open Only</option>
                <option value="In Progress">In Progress Only</option>
                <option value="Resolved">Resolved / Closed</option>
              </select>

              <select
                value={adminPriorityFilter}
                onChange={e => setAdminPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 outline-none cursor-pointer"
              >
                <option value="All">All Priorities</option>
                <option value="Urgent">Urgent Priority</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* ADMIN MASTER TICKETS TABLE */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Ticket</th>
                    <th className="p-4">User & Subject</th>
                    <th className="p-4">Assigned Engineer</th>
                    <th className="p-4">Status Triage</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {tickets
                    .filter(t => adminStatusFilter === 'All' || t.status === adminStatusFilter)
                    .filter(t => adminPriorityFilter === 'All' || t.priority === adminPriorityFilter)
                    .map(ticket => (
                      <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                          {ticket.id}
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="font-extrabold text-gray-900">{ticket.subject}</div>
                          <div className="text-[11px] text-gray-500">{ticket.userName} ({ticket.userEmail})</div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <select
                            value={ticket.assignedTo}
                            onChange={e => handleAdminUpdateTicket(ticket.id, null, e.target.value)}
                            className="px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 outline-none cursor-pointer"
                          >
                            <option value="Unassigned (In Triage)">Unassigned (In Triage)</option>
                            <option value="Rajesh Sharma (Senior Tax Specialist)">Rajesh Sharma (Tax Specialist)</option>
                            <option value="Priya Patel (Integration Engineer)">Priya Patel (Integration)</option>
                            <option value="Ananya Verma (Billing Lead)">Ananya Verma (Billing)</option>
                          </select>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <select
                            value={ticket.status}
                            onChange={e => handleAdminUpdateTicket(ticket.id, e.target.value, null)}
                            className="px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 outline-none cursor-pointer"
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Waiting for User">Waiting for User</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            ticket.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                            ticket.priority === 'High' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Manage Thread
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🐛 TAB 7: REPORT A BUG FORM                                              */}
      {/* ========================================================================= */}
      {activeTab === 'bug' && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-lg animate-page-fade">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black font-outfit text-gray-900">Report a Technical Bug</h2>
              <p className="text-xs text-gray-500">Provide reproducible steps so our engineering team can isolate and patch the issue</p>
            </div>
          </div>

          <form onSubmit={handleBugSubmit} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="text-gray-700 block mb-1">Issue Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. PDF generation button unresponsive on Firefox browser..."
                value={bugForm.title}
                onChange={e => setBugForm({ ...bugForm, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-rose-500 text-xs font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-700 block mb-1">Category Head</label>
                <select
                  value={bugForm.category}
                  onChange={e => setBugForm({ ...bugForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-rose-500 text-xs font-bold cursor-pointer"
                >
                  <option value="UI / Display Glitch">UI / Display Glitch</option>
                  <option value="Report / PDF Generation">Report / PDF Generation</option>
                  <option value="Fees Tracking / Ledger Calculation">Fees Tracking / Ledger Calculation</option>
                  <option value="Attendance / Clock-in">Attendance / Clock-in</option>
                  <option value="Login / Authentication">Login / Authentication</option>
                  <option value="Performance / Slow Loading">Performance / Slow Loading</option>
                </select>
              </div>

              <div>
                <label className="text-gray-700 block mb-1">Severity / Priority</label>
                <select
                  value={bugForm.priority}
                  onChange={e => setBugForm({ ...bugForm, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-rose-500 text-xs font-bold cursor-pointer"
                >
                  <option value="Low">Low - Minor cosmetic issue</option>
                  <option value="Medium">Medium - Normal workflow hindrance</option>
                  <option value="High">High - Critical feature broken</option>
                  <option value="Urgent">Urgent - Complete workflow blocker</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-gray-700 block mb-1">Steps to Reproduce <span className="text-red-500">*</span></label>
              <textarea
                rows="3"
                placeholder="1. Open Fees Tracking&#10;2. Click on Print by Date / Month&#10;3. Select Whole Financial Year and click Print..."
                value={bugForm.stepsToReproduce}
                onChange={e => setBugForm({ ...bugForm, stepsToReproduce: e.target.value })}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-rose-500 text-xs font-medium resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-700 block mb-1">Expected Result</label>
                <input
                  type="text"
                  placeholder="e.g. PDF print preview dialog opens"
                  value={bugForm.expectedResult}
                  onChange={e => setBugForm({ ...bugForm, expectedResult: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-rose-500 text-xs"
                />
              </div>

              <div>
                <label className="text-gray-700 block mb-1">Actual Result</label>
                <input
                  type="text"
                  placeholder="e.g. Screen stays unchanged"
                  value={bugForm.actualResult}
                  onChange={e => setBugForm({ ...bugForm, actualResult: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-rose-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-700 block mb-1">Auto-Captured Environment</label>
              <input
                type="text"
                readOnly
                value={bugForm.browser}
                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-mono text-[11px] cursor-not-allowed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center gap-1.5"
              >
                <Bug className="w-3.5 h-3.5" /> Submit Bug Report
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💡 TAB 8: REQUEST A FEATURE FORM                                         */}
      {/* ========================================================================= */}
      {activeTab === 'feature' && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-lg animate-page-fade">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black font-outfit text-gray-900">Request a Feature or Workflow Improvement</h2>
              <p className="text-xs text-gray-500">Help us shape the future of TaxPro by suggesting automation workflows</p>
            </div>
          </div>

          <form onSubmit={handleFeatureSubmit} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="text-gray-700 block mb-1">Feature Name / Concept <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Automated WhatsApp PDF Invoice dispatch on payment settling..."
                value={featureForm.featureName}
                onChange={e => setFeatureForm({ ...featureForm, featureName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-amber-500 text-xs font-bold"
                required
              />
            </div>

            <div>
              <label className="text-gray-700 block mb-1">Category</label>
              <select
                value={featureForm.category}
                onChange={e => setFeatureForm({ ...featureForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-amber-500 text-xs font-bold cursor-pointer"
              >
                <option value="Practice Automation">Practice Automation</option>
                <option value="Client Portal & Communications">Client Portal & Communications</option>
                <option value="Tax Compliance & Form Prefill">Tax Compliance & Form Prefill</option>
                <option value="Billing & Accounting Sync">Billing & Accounting Sync</option>
                <option value="Reporting & Analytics">Reporting & Analytics</option>
                <option value="Mobile & Tablet Experience">Mobile & Tablet Experience</option>
              </select>
            </div>

            <div>
              <label className="text-gray-700 block mb-1">Detailed Description <span className="text-red-500">*</span></label>
              <textarea
                rows="3"
                placeholder="Explain what the feature should do and how practitioners would use it..."
                value={featureForm.description}
                onChange={e => setFeatureForm({ ...featureForm, description: e.target.value })}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-amber-500 text-xs font-medium resize-none"
                required
              />
            </div>

            <div>
              <label className="text-gray-700 block mb-1">Why do you need this? (Firm Benefit)</label>
              <textarea
                rows="2"
                placeholder="e.g. It will save our 10-person audit team 4 hours every week during GST filing week..."
                value={featureForm.whyNeeded}
                onChange={e => setFeatureForm({ ...featureForm, whyNeeded: e.target.value })}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-amber-500 text-xs font-medium resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center gap-1.5"
              >
                <Lightbulb className="w-3.5 h-3.5" /> Submit Feature Idea
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📖 ARTICLE READER MODAL                                                   */}
      {/* ========================================================================= */}
      {selectedArticle && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedArticle(null); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth text-slate-800">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                    {selectedArticle.categoryName} • {selectedArticle.readTime}
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 mt-0.5">
                    {selectedArticle.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Article Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal space-y-4 overscroll-contain chat-custom-scrollbar">
              <p className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
                {selectedArticle.summary}
              </p>

              <div className="prose prose-sm max-w-none text-xs text-slate-700 font-medium space-y-3">
                {selectedArticle.content.split('\n\n').map((block, idx) => {
                  if (block.startsWith('### ')) {
                    return <h4 key={idx} className="text-sm font-black font-outfit text-slate-900 pt-2">{block.replace('### ', '')}</h4>;
                  }
                  if (block.startsWith('> ')) {
                    return (
                      <div key={idx} className="p-3.5 bg-indigo-50/50 border-l-4 border-indigo-600 rounded-r-2xl text-xs text-indigo-950 font-bold shadow-2xs">
                        {block.replace('> ', '')}
                      </div>
                    );
                  }
                  return <p key={idx} className="leading-relaxed whitespace-pre-line">{block}</p>;
                })}
              </div>

              {/* Feedback Survey */}
              <div className="pt-6 mt-6 border-t border-slate-100 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
                <span className="font-bold text-slate-800">Was this article helpful to your firm?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onShowToast) onShowToast('✓ Thank you for your feedback!', 'success');
                      setSelectedArticle(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Yes, very helpful
                  </button>
                  <button
                    onClick={() => {
                      if (onShowToast) onShowToast('Feedback recorded. Opening ticket creation...', 'info');
                      setSelectedArticle(null);
                      setIsCreateTicketModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> No, need more help
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💬 FULL SUPPORT TICKET CONVERSATION MODAL                                 */}
      {/* ========================================================================= */}
      {selectedTicket && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTicket(null); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth text-slate-800">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{selectedTicket.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      selectedTicket.status === 'Open' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      selectedTicket.status === 'In Progress' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      selectedTicket.status === 'Escalated' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {selectedTicket.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{selectedTicket.category}</span>
                  </div>
                  <h3 className="text-base font-black font-outfit text-slate-900 mt-1">
                    {selectedTicket.subject}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Log & Message Flow */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs overscroll-contain chat-custom-scrollbar">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{selectedTicket.requester}</span>
                  <span className="text-[11px] text-slate-400 font-mono">{selectedTicket.createdAt}</span>
                </div>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {selectedTicket.description}
                </p>
              </div>

              {selectedTicket.replies?.map((rep, rIdx) => (
                <div
                  key={rIdx}
                  className={`p-4 rounded-2xl text-xs space-y-2 shadow-2xs ${
                    rep.isStaff
                      ? 'bg-indigo-50/50 border border-indigo-200 text-indigo-950 ml-6'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 mr-6'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{rep.author}</span>
                      {rep.isStaff && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold text-[9px]">TaxPro Support Engineer</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{rep.timestamp}</span>
                  </div>
                  <p className="leading-relaxed font-medium">{rep.message}</p>
                </div>
              ))}
            </div>

            {/* Reply Input Box */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a response or attach further details..."
                  value={ticketReplyText}
                  onChange={e => setTicketReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendTicketReply(); }}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-600 shadow-2xs font-semibold"
                />
                <button
                  type="button"
                  onClick={handleSendTicketReply}
                  disabled={!ticketReplyText.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ➕ CREATE NEW SUPPORT TICKET MODAL                                        */}
      {/* ========================================================================= */}
      {isCreateTicketModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsCreateTicketModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth text-slate-800">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900">Create Support Ticket</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Submit an inquiry with high-priority SLA response</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateTicketModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              <div>
                <label className="text-slate-700 block mb-1">Subject / Issue Summary <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Assistance required with GST reconciliation or cyclic rent..."
                  value={newTicket.subject}
                  onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs font-bold text-slate-900 shadow-2xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 block mb-1">Issue Category</label>
                  <select
                    value={newTicket.category}
                    onChange={e => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs font-bold cursor-pointer shadow-2xs"
                  >
                    <option value="Getting Started">Getting Started</option>
                    <option value="Tax & Compliance">Tax & Compliance</option>
                    <option value="Account & Security">Account & Security</option>
                    <option value="Billing & Payments">Billing & Payments</option>
                    <option value="Reports & Documents">Reports & Documents</option>
                    <option value="Technical Support">Technical Support</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Priority Level</label>
                  <select
                    value={newTicket.priority}
                    onChange={e => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs font-bold cursor-pointer shadow-2xs"
                  >
                    <option value="Low">Low - General Question</option>
                    <option value="Medium">Medium - Normal Support Request</option>
                    <option value="High">High - Workflow Impacted</option>
                    <option value="Urgent">Urgent - Immediate SLA Dispatch</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1">Detailed Description <span className="text-rose-500">*</span></label>
                <textarea
                  rows="4"
                  placeholder="Describe your question or issue in detail..."
                  value={newTicket.description}
                  onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs font-medium resize-none shadow-2xs"
                  required
                />
              </div>

              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateTicketModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95 transition-all"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🤖 FLOATING TAXPRO AI HELP ASSISTANT WIDGET                                */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isAIChatOpen ? (
          <button
            onClick={() => setIsAIChatOpen(true)}
            className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white font-extrabold text-xs sm:text-sm shadow-2xl hover:shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-white/20"
          >
            <div className="relative">
              <Bot className="w-5 h-5 animate-bounce" />
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 absolute -top-1 -right-1 ring-2 ring-indigo-900"></span>
            </div>
            <span>Ask TaxPro AI</span>
          </button>
        ) : (
          <div className="w-96 sm:w-[420px] bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-[520px] animate-page-fade">
            {/* AI Header */}
            <div className="bg-gradient-to-r from-[#161722] via-[#24263e] to-[#161722] text-white p-4 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black font-outfit text-white flex items-center gap-1.5">
                    TaxPro AI Help Assistant
                    <span className="px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 text-[9px] font-mono">Live</span>
                  </h4>
                  <p className="text-[10px] text-gray-300">Instant answers on product features & workflows</p>
                </div>
              </div>
              <button
                onClick={() => setIsAIChatOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MANDATORY LEGAL & TAX DISCLAIMER BANNER */}
            <div className="p-2.5 bg-amber-50 border-b border-amber-200 text-[10px] text-amber-950 font-medium flex items-start gap-1.5 leading-tight">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Guidance Notice:</strong> Information provided is for general platform guidance. Please consult a qualified tax professional for formal legal advice.
              </span>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 text-xs">
              {aiMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-2 max-w-[90%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs ${
                    msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-purple-700 text-white'
                  }`}>
                    {msg.sender === 'user' ? 'U' : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div>
                    <div className={`p-3 rounded-2xl leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#5b52e0] text-white rounded-tr-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-2xs'
                    }`}>
                      <p>{msg.text}</p>

                      {msg.sender === 'ai' && (
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 text-[10px] text-gray-400">
                          <button
                            onClick={() => handleCopyAIResponse(msg.id, msg.text)}
                            className="hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                          >
                            {msg.copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{msg.copied ? 'Copied' : 'Copy'}</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleRateAIResponse(msg.id, true)}
                              className={`p-1 rounded cursor-pointer ${msg.helpful === true ? 'text-emerald-600' : 'hover:text-emerald-600'}`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleRateAIResponse(msg.id, false)}
                              className={`p-1 rounded cursor-pointer ${msg.helpful === false ? 'text-rose-600' : 'hover:text-rose-600'}`}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {msg.canEscalate && (
                      <button
                        onClick={() => {
                          setIsAIChatOpen(false);
                          setIsCreateTicketModalOpen(true);
                        }}
                        className="mt-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-200 cursor-pointer flex items-center gap-1"
                      >
                        <Ticket className="w-3 h-3" /> Connect with Human Support
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isAITyping && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-[10px]">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-3 bg-white border border-gray-200 rounded-2xl rounded-tl-none text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Suggestion Prompts */}
            <div className="p-2 bg-white border-t border-gray-100 flex items-center gap-1 overflow-x-auto text-[10px] shrink-0">
              {[
                'How to add client retainer?',
                'Why is OTP delayed?',
                'How to export GST report?'
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => {
                    setAiInput(prompt);
                    setTimeout(() => handleSendAIMessage(), 50);
                  }}
                  className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap cursor-pointer font-semibold"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="p-3 bg-white border-t border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about TaxPro..."
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendAIMessage(); }}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs"
                />
                <button
                  onClick={handleSendAIMessage}
                  disabled={!aiInput.trim()}
                  className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
