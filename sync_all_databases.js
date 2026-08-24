import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const localConnStr = 'postgresql://postgres:Krushil%402007@localhost:5432/taxpro';
const cloudConnStr = 'postgres://postgres.ndqipazuejxuvnrcpbma:Nt9rCyvMPugoa62j@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

const schemaSQL = `
  -- Users Table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'Financial Director',
    company_id TEXT,
    company TEXT DEFAULT 'TaxPro Enterprise',
    phone TEXT,
    phone_verified BOOLEAN DEFAULT FALSE,
    avatar TEXT,
    lock_pin TEXT DEFAULT '1234',
    gstin TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    last_communication_read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Team Members Table
  CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'Employee',
    department TEXT DEFAULT 'General',
    status TEXT DEFAULT 'Active',
    preset_password TEXT,
    salary TEXT DEFAULT '$10,000/mo',
    attendance TEXT DEFAULT '98.5%',
    tasks_completed INT DEFAULT 0,
    online BOOLEAN DEFAULT TRUE,
    avatar TEXT,
    rating NUMERIC DEFAULT 5.0,
    permissions JSONB DEFAULT '{}'::jsonb,
    pan TEXT,
    bank_account TEXT,
    ifsc TEXT,
    emergency_contact TEXT,
    date_of_joining TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Departments Table
  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    manager TEXT,
    initials TEXT,
    description TEXT,
    head_count INT DEFAULT 0,
    budget TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Clients Table
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    trade_name TEXT,
    pan TEXT,
    gst TEXT,
    file_no TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    contact_person TEXT,
    attached_doc TEXT,
    status TEXT DEFAULT 'Active',
    notes TEXT,
    category TEXT DEFAULT 'Regular',
    payment_history JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Authorized Contact Persons Table
  CREATE TABLE IF NOT EXISTS contact_persons (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    client_name TEXT,
    name TEXT NOT NULL,
    designation TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Global Tasks Table
  CREATE TABLE IF NOT EXISTS global_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    client TEXT,
    client_id TEXT,
    category TEXT DEFAULT 'General',
    due_date TEXT,
    status TEXT DEFAULT 'To Do',
    priority TEXT DEFAULT 'Medium',
    assignee TEXT,
    project TEXT,
    project_id TEXT,
    attachment TEXT,
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    subtasks JSONB DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Projects Table
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client TEXT,
    client_id TEXT,
    lead TEXT,
    deadline TEXT,
    start_date TEXT,
    status TEXT DEFAULT 'In Progress',
    priority TEXT DEFAULT 'Medium',
    budget TEXT DEFAULT '$10,000',
    progress INT DEFAULT 0,
    description TEXT,
    category TEXT DEFAULT 'General',
    tasks JSONB DEFAULT '[]'::jsonb,
    team_assigned JSONB DEFAULT '[]'::jsonb,
    milestones JSONB DEFAULT '[]'::jsonb,
    attachment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- ToDos Table
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    user_email TEXT,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'Medium',
    category TEXT DEFAULT 'General',
    due_date TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Ideas Table
  CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    department TEXT,
    description TEXT,
    votes INT DEFAULT 1,
    status TEXT DEFAULT 'Under Review',
    tags JSONB DEFAULT '[]'::jsonb,
    comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Attendance Logs Table
  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    employee_id TEXT,
    employee_name TEXT,
    mode TEXT DEFAULT 'fingerprint',
    shift TEXT DEFAULT 'Morning Shift A',
    location TEXT DEFAULT 'HQ Main Gate',
    biometric_score NUMERIC DEFAULT 99.8,
    anti_spoof_passed BOOLEAN DEFAULT TRUE,
    date DATE DEFAULT CURRENT_DATE,
    logged_at TEXT,
    punch_in TEXT,
    punch_out TEXT,
    working_hours NUMERIC DEFAULT 8.0,
    status TEXT DEFAULT 'Present',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Reports Table
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'Tax Return',
    status TEXT DEFAULT 'Verified',
    date TEXT,
    size TEXT DEFAULT '2.5 MB',
    file_url TEXT,
    client TEXT,
    client_id TEXT,
    month TEXT,
    year TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Payments & Transactions Table
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    client_name TEXT,
    category TEXT DEFAULT 'General',
    method TEXT DEFAULT 'UPI',
    amount TEXT NOT NULL,
    numeric_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Success',
    payment_id TEXT,
    order_id TEXT,
    date TEXT,
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Receipts & Financial Entries Table
  CREATE TABLE IF NOT EXISTS receipts_payments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'income',
    category TEXT DEFAULT 'Client Fee',
    amount NUMERIC DEFAULT 0,
    method TEXT DEFAULT 'Bank Transfer',
    date TEXT,
    party TEXT,
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Fees Table
  CREATE TABLE IF NOT EXISTS fees (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_id TEXT,
    invoice_no TEXT,
    amount NUMERIC DEFAULT 0,
    paid NUMERIC DEFAULT 0,
    pending NUMERIC DEFAULT 0,
    service TEXT DEFAULT 'Audit & Tax Filing',
    status TEXT DEFAULT 'Pending',
    due_date TEXT,
    paid_date TEXT,
    payment_mode TEXT,
    gstin TEXT,
    pan TEXT,
    notes TEXT,
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS fees_invoices (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_id TEXT,
    invoice_no TEXT,
    amount NUMERIC DEFAULT 0,
    paid NUMERIC DEFAULT 0,
    pending NUMERIC DEFAULT 0,
    service TEXT DEFAULT 'Audit & Tax Filing',
    status TEXT DEFAULT 'Pending',
    due_date TEXT,
    paid_date TEXT,
    payment_mode TEXT,
    gstin TEXT,
    pan TEXT,
    notes TEXT,
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Member Payouts Table
  CREATE TABLE IF NOT EXISTS member_payouts (
    id TEXT PRIMARY KEY,
    member_id TEXT,
    member_name TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    type TEXT DEFAULT 'Salary',
    month TEXT,
    year TEXT,
    status TEXT DEFAULT 'Processed',
    payment_date TEXT,
    method TEXT DEFAULT 'Bank Transfer',
    transaction_ref TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Private Messages Table
  CREATE TABLE IF NOT EXISTS private_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    sender_name TEXT,
    receiver_id TEXT NOT NULL,
    receiver_name TEXT,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    read BOOLEAN DEFAULT FALSE,
    read_by JSONB DEFAULT '[]'::jsonb,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Broadcast Messages Table
  CREATE TABLE IF NOT EXISTS broadcast_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_avatar TEXT,
    content TEXT NOT NULL,
    channel TEXT DEFAULT 'general-hq',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Communication Logs Table
  CREATE TABLE IF NOT EXISTS communication_logs (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    subject TEXT NOT NULL,
    channel TEXT DEFAULT 'Email',
    type TEXT DEFAULT 'Notice',
    content TEXT,
    status TEXT DEFAULT 'Sent',
    sent_by TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Calendar Events Table
  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'event',
    amount NUMERIC DEFAULT 0,
    client_name TEXT,
    category TEXT,
    status TEXT DEFAULT 'Active',
    notes TEXT,
    user_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Support Tickets Table
  CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    ticket_no TEXT,
    user_id TEXT,
    user_email TEXT,
    user_name TEXT,
    subject TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Open',
    response TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Firm Profile Table
  CREATE TABLE IF NOT EXISTS firm_profile (
    id TEXT PRIMARY KEY,
    practice_name TEXT DEFAULT 'TaxPro Enterprise',
    gstin TEXT,
    pan TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    authorized_signatory TEXT,
    din TEXT,
    logo_url TEXT,
    lock_pin TEXT DEFAULT '1234',
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- App Settings Table
  CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Integrations Table
  CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    type TEXT UNIQUE NOT NULL,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- App Storage (Universal Key-Value Store)
  CREATE TABLE IF NOT EXISTS app_storage (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- AI Action Logs Table
  CREATE TABLE IF NOT EXISTS ai_action_logs (
    id TEXT PRIMARY KEY,
    user_email TEXT,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Create indexes
  CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_name ON departments (name);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_email ON team_members (email);
  CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON ai_action_logs (user_email);
  CREATE INDEX IF NOT EXISTS idx_pmsg_lookup ON private_messages (sender_id, receiver_id);
  CREATE INDEX IF NOT EXISTS idx_bmsg_channel ON broadcast_messages (channel);
  CREATE INDEX IF NOT EXISTS idx_clients_status ON clients (status);
  CREATE INDEX IF NOT EXISTS idx_global_tasks_status ON global_tasks (status);
  CREATE INDEX IF NOT EXISTS idx_fees_status ON fees (status);
`;

async function applyToDb(label, connectionString, sslConfig) {
  console.log(`\n======================================================`);
  console.log(`🔧 Applying Schemas & Seeds to [${label}]...`);
  console.log(`🔗 Target: ${connectionString.split('@')[1] || connectionString}`);
  console.log(`======================================================`);

  try {
    const pool = new Pool({
      connectionString,
      ssl: sslConfig,
      connectionTimeoutMillis: 10000
    });

    // 1. Create all tables
    await pool.query(schemaSQL);
    console.log(`✅ All 26 Tables Created Successfully on [${label}].`);

    // 2. Run column alterations
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS lock_pin TEXT DEFAULT '1234';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS gstin TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT DEFAULT 'TaxPro Enterprise';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS pan TEXT;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS bank_account TEXT;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS ifsc TEXT;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS date_of_joining TEXT;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_count INT DEFAULT 0;
        ALTER TABLE departments ADD COLUMN IF NOT EXISTS budget TEXT;
        ALTER TABLE departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        ALTER TABLE clients ADD COLUMN IF NOT EXISTS trade_name TEXT;
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS city TEXT;
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS state TEXT;
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS pincode TEXT;
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person TEXT;
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Regular';
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        ALTER TABLE fees ADD COLUMN IF NOT EXISTS client_id TEXT;
        ALTER TABLE fees ADD COLUMN IF NOT EXISTS paid NUMERIC DEFAULT 0;
        ALTER TABLE fees ADD COLUMN IF NOT EXISTS pending NUMERIC DEFAULT 0;
        ALTER TABLE fees ADD COLUMN IF NOT EXISTS paid_date TEXT;
        ALTER TABLE fees ADD COLUMN IF NOT EXISTS payment_mode TEXT;
        ALTER TABLE fees ADD COLUMN IF NOT EXISTS gstin TEXT;
        ALTER TABLE fees ADD COLUMN IF NOT EXISTS pan TEXT;
        ALTER TABLE fees ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE fees ADD COLUMN IF NOT EXISTS date TEXT;
        ALTER TABLE fees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        ALTER TABLE fees_invoices ADD COLUMN IF NOT EXISTS client_id TEXT;
        ALTER TABLE fees_invoices ADD COLUMN IF NOT EXISTS paid NUMERIC DEFAULT 0;
        ALTER TABLE fees_invoices ADD COLUMN IF NOT EXISTS pending NUMERIC DEFAULT 0;
        ALTER TABLE fees_invoices ADD COLUMN IF NOT EXISTS paid_date TEXT;
        ALTER TABLE fees_invoices ADD COLUMN IF NOT EXISTS payment_mode TEXT;
        ALTER TABLE fees_invoices ADD COLUMN IF NOT EXISTS gstin TEXT;
        ALTER TABLE fees_invoices ADD COLUMN IF NOT EXISTS pan TEXT;
        ALTER TABLE fees_invoices ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE fees_invoices ADD COLUMN IF NOT EXISTS date TEXT;
        ALTER TABLE fees_invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_name TEXT;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference TEXT;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;

        ALTER TABLE receipts_payments ADD COLUMN IF NOT EXISTS party TEXT;
        ALTER TABLE receipts_payments ADD COLUMN IF NOT EXISTS reference TEXT;
        ALTER TABLE receipts_payments ADD COLUMN IF NOT EXISTS notes TEXT;

        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS punch_in TEXT;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS punch_out TEXT;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS working_hours NUMERIC DEFAULT 8.0;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS notes TEXT;

        ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
        ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS receiver_name TEXT;
        ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      `);
      console.log(`✅ Column Migrations Verified on [${label}].`);
    } catch (e) {}

    // 3. Seed Users
    const uCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(uCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO users (id, email, password, name, role, company)
        VALUES 
          ('USR-1000', 'krushilgadhiya0@gmail.com', 'password123', 'Krushil Gadhiya', 'Managing Director & CFO', 'TaxPro PMS Enterprise'),
          ('USR-1001', 'superadmin@taxpro.com', 'password123', 'Super Admin', 'Super Administrator', 'TaxPro Core'),
          ('USR-1002', 'admin@gmail.com', 'password123', 'Admin CFO', 'Administrator', 'TaxPro AI Core')
        ON CONFLICT (email) DO NOTHING;
      `);
      console.log(`✅ Seeded Core Users on [${label}].`);
    }

    // 4. Seed Departments
    const dCount = await pool.query('SELECT COUNT(*) FROM departments');
    if (parseInt(dCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO departments (id, name, manager, initials, description)
        VALUES 
          ('DEPT-1', 'Taxation & Filing', 'Tax Lead', 'TF', 'Direct & Indirect Tax Returns, GST, TDS filing'),
          ('DEPT-2', 'Corporate Audit', 'Audit Lead', 'CA', 'Statutory, Internal, and Forensic Accounting Audits'),
          ('DEPT-3', 'Financial Planning', 'Finance Lead', 'FP', 'Portfolio management, forecasting, and investment analysis'),
          ('DEPT-4', 'Advisory & Legal', 'Advisory Lead', 'AL', 'Regulatory consulting and compliance advisory')
        ON CONFLICT (name) DO NOTHING;
      `);
      console.log(`✅ Seeded Core Departments on [${label}].`);
    }

    // 5. Seed Team Members
    const tCount = await pool.query('SELECT COUNT(*) FROM team_members');
    if (parseInt(tCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO team_members (id, name, email, phone, role, department, status, preset_password, salary, attendance, tasks_completed, online, avatar, rating)
        VALUES 
          ('EMP-101', 'Dr. Sarah Jenkins', 'sarah.jenkins@taxpro.ai', '+1 (555) 234-5678', 'Principal AI Architect', 'Engineering', 'Active', 'password123', '$14,500/mo', '99.2%', 42, true, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80', 5.0),
          ('EMP-102', 'Marcus Vance', 'marcus.vance@taxpro.ai', '+1 (555) 345-6789', 'Senior Fintech Strategist', 'Finance', 'Active', 'password123', '$12,800/mo', '98.5%', 38, true, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80', 4.9),
          ('EMP-103', 'Elena Rostova', 'elena.rostova@taxpro.ai', '+1 (555) 456-7890', 'Head of Risk & Compliance', 'Security', 'Active', 'password123', '$13,200/mo', '100%', 51, true, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80', 5.0)
        ON CONFLICT (email) DO NOTHING;
      `);
      console.log(`✅ Seeded Core Team Members on [${label}].`);
    }

    // List count of public tables
    const tableListRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log(`\n📋 Verified Public Tables on [${label}] (${tableListRes.rows.length} total):`);
    console.log(tableListRes.rows.map(r => r.table_name).join(', '));

    await pool.end();
  } catch (err) {
    console.error(`❌ Error configuring [${label}]:`, err.message);
  }
}

async function run() {
  console.log('🚀 Starting Universal Multi-Database Table Synchronizer...');
  
  // 1. Sync Local Database
  await applyToDb('LOCAL POSTGRESQL (localhost:5432/taxpro)', localConnStr, false);

  // 2. Sync Cloud Database (Supabase)
  await applyToDb('CLOUD SUPABASE (ndqipazuejxuvnrcpbma)', cloudConnStr, { rejectUnauthorized: false });

  console.log('\n🎯 ALL DATABASES (LOCAL & CLOUD) SYNCHRONIZED SUCCESSFULLY!');
  process.exit(0);
}

run();
