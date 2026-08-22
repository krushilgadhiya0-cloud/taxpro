import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

// Resolve PostgreSQL Connection String
const rawConnStr = 
  process.env.DATABASE_URL ||
  process.env.taxpro_POSTGRES_URL_NON_POOLING ||
  process.env.taxpro_POSTGRES_URL ||
  process.env.taxpro_POSTGRES_PRISMA_URL;

if (!rawConnStr) {
  console.warn('⚠️ No PostgreSQL connection string found in environment variables.');
}

// Clean connection string (strip sslmode query param to avoid pg library SSL conflict)
const cleanConnStr = rawConnStr ? rawConnStr.split('?')[0] : '';

export const pool = new Pool({
  connectionString: cleanConnStr,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Helper for single query execution
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[PostgreSQL] Executed query in ${duration}ms:`, { text, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error(`[PostgreSQL Error] Query failed: ${text}`, err.message);
    throw err;
  }
};

// Initialize All Relational Tables in PostgreSQL
export async function initDatabase() {
  console.log('[PostgreSQL Engine] Initializing and verifying database tables...');

  const schemaSQL = `
    -- Users Table (Authentication, Profile & Firm Lock)
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

    -- Receipts & Financial Entries Table (Calendar Daily Ledger & Practice Cash Flow)
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

    -- Fees & Invoices Table
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

    -- Member Payouts / Payroll History Table
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

    -- Private Messages Table (Real-Time Peer-to-Peer Chat)
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

    -- Broadcast Messages Table (Global Team & Channel Chat)
    CREATE TABLE IF NOT EXISTS broadcast_messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_avatar TEXT,
      content TEXT NOT NULL,
      channel TEXT DEFAULT 'general-hq',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Communication Logs Table (Client Notices, Emails, WhatsApp, SMS)
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

    -- Calendar Events & Activity Hub Table
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

    -- Support Tickets & Complaints Table
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

    -- Firm Profile & Settings Table
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

    -- App Integrations Config Table
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      type TEXT UNIQUE NOT NULL,
      config JSONB NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- App Storage (Universal Key-Value JSONB Sync Store)
    CREATE TABLE IF NOT EXISTS app_storage (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- AI Action Audit Logs Table
    CREATE TABLE IF NOT EXISTS ai_action_logs (
      id TEXT PRIMARY KEY,
      user_email TEXT,
      action TEXT NOT NULL,
      details JSONB DEFAULT '{}'::jsonb,
      result TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes for performance & uniqueness
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

  try {
    await query(schemaSQL);

    // Run dynamic column alterations to ensure existing database gains all new fields
    try {
      await query(`
        -- Users column migrations
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
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

        -- Team members column migrations
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS pan TEXT;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS bank_account TEXT;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS ifsc TEXT;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS date_of_joining TEXT;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE team_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        -- Departments column migrations
        ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_count INT DEFAULT 0;
        ALTER TABLE departments ADD COLUMN IF NOT EXISTS budget TEXT;
        ALTER TABLE departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        -- Clients column migrations
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

        -- Contact persons column migrations
        ALTER TABLE contact_persons ADD COLUMN IF NOT EXISTS client_name TEXT;
        ALTER TABLE contact_persons ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT TRUE;

        -- Global tasks column migrations
        ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS client_id TEXT;
        ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS project_id TEXT;
        ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
        ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        -- Projects column migrations
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id TEXT;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date TEXT;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_assigned JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS attachment TEXT;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        -- ToDos column migrations
        ALTER TABLE todos ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;
        ALTER TABLE todos ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE todos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        -- Fees column migrations
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

        -- Fees invoices column migrations
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

        -- Payments column migrations
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_name TEXT;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference TEXT;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE payments ALTER COLUMN company_id DROP NOT NULL;
        ALTER TABLE payments ALTER COLUMN employee_id DROP NOT NULL;
        ALTER TABLE payments ALTER COLUMN due_date DROP NOT NULL;
        ALTER TABLE payments ALTER COLUMN payment_method DROP NOT NULL;
        ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

        -- Receipts & Payments column migrations
        ALTER TABLE receipts_payments ADD COLUMN IF NOT EXISTS party TEXT;
        ALTER TABLE receipts_payments ADD COLUMN IF NOT EXISTS reference TEXT;
        ALTER TABLE receipts_payments ADD COLUMN IF NOT EXISTS notes TEXT;

        -- Attendance column migrations
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS punch_in TEXT;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS punch_out TEXT;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS working_hours NUMERIC DEFAULT 8.0;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE attendance ALTER COLUMN company_id DROP NOT NULL;
        ALTER TABLE attendance ALTER COLUMN employee_id DROP NOT NULL;
        ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
        ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_fkey;
        ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_company_id_fkey;

        -- Private messages column migrations
        ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
        ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS receiver_name TEXT;
        ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      `);
    } catch (e) {
      console.warn('[PostgreSQL Engine] Notice during column migrations:', e.message);
    }

    console.log('✓ [PostgreSQL Engine] Schema verified and synchronized with all tables and columns.');
    
    // Seed initial data if tables are empty
    await seedInitialData();
  } catch (err) {
    console.error('✗ [PostgreSQL Engine] Error setting up database schema:', err.message);
  }
}

// Seed default accounts & demo items if database is clean
async function seedInitialData() {
  try {
    // 1. Seed Default Users
    const userCount = await query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count, 10) === 0) {
      console.log('[PostgreSQL Engine] Seeding initial users...');
      const defaultUsers = [
        {
          id: 'USR-1000',
          email: 'krushilgadhiya0@gmail.com',
          password: 'password123',
          name: 'Krushil Gadhiya',
          role: 'Managing Director & CFO',
          company: 'Finexo PMS Enterprise'
        },
        {
          id: 'USR-1001',
          email: 'cfo@taxpro.ai',
          password: 'password123',
          name: 'Alex Sterling',
          role: 'Chief Financial Officer',
          company: 'Sterling Capital Financial'
        },
        {
          id: 'USR-1002',
          email: 'superadmin@taxpro.com',
          password: 'password123',
          name: 'Super Admin',
          role: 'Super Administrator',
          company: 'TaxPro Core'
        },
        {
          id: 'USR-1003',
          email: 'admin@gmail.com',
          password: 'password123',
          name: 'Admin CFO',
          role: 'Administrator',
          company: 'TaxPro AI Core'
        },
        {
          id: 'USR-1004',
          email: 'alex.sterling@gmail.com',
          password: 'password123',
          name: 'Alex Sterling',
          role: 'Chief Financial Officer',
          company: 'TaxPro Global'
        }
      ];

      for (const u of defaultUsers) {
        await query(`
          INSERT INTO users (id, email, password, name, role, company)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email) DO NOTHING;
        `, [u.id, u.email, u.password, u.name, u.role, u.company]);
      }
    }

    // 2. Seed Team Members
    const memberCount = await query('SELECT COUNT(*) FROM team_members');
    if (parseInt(memberCount.rows[0].count, 10) === 0) {
      console.log('[PostgreSQL Engine] Seeding initial team members...');
      const defaultMembers = [
        {
          id: 'EMP-101',
          name: 'Dr. Sarah Jenkins',
          email: 'sarah.jenkins@taxpro.ai',
          phone: '+1 (555) 234-5678',
          role: 'Principal AI Architect',
          department: 'Engineering',
          status: 'Active',
          preset_password: 'password123',
          salary: '$14,500/mo',
          attendance: '99.2%',
          tasks_completed: 42,
          online: true,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
          rating: 5.0
        },
        {
          id: 'EMP-102',
          name: 'Marcus Vance',
          email: 'marcus.vance@taxpro.ai',
          phone: '+1 (555) 345-6789',
          role: 'Senior Fintech Strategist',
          department: 'Finance',
          status: 'Active',
          preset_password: 'password123',
          salary: '$12,800/mo',
          attendance: '98.5%',
          tasks_completed: 38,
          online: true,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
          rating: 4.9
        },
        {
          id: 'EMP-103',
          name: 'Elena Rostova',
          email: 'elena.rostova@taxpro.ai',
          phone: '+1 (555) 456-7890',
          role: 'Head of Risk & Compliance',
          department: 'Security',
          status: 'Active',
          preset_password: 'password123',
          salary: '$13,200/mo',
          attendance: '100%',
          tasks_completed: 51,
          online: true,
          avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
          rating: 5.0
        },
        {
          id: 'EMP-104',
          name: 'David Chen',
          email: 'david.chen@taxpro.ai',
          phone: '+1 (555) 567-8901',
          role: 'Lead UX Engineer',
          department: 'Design',
          status: 'Active',
          preset_password: 'password123',
          salary: '$11,500/mo',
          attendance: '96.8%',
          tasks_completed: 29,
          online: false,
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
          rating: 4.8
        },
        {
          id: 'EMP-105',
          name: 'Amara Okafor',
          email: 'amara.okafor@taxpro.ai',
          phone: '+1 (555) 678-9012',
          role: 'DevOps & Cloud Systems',
          department: 'Engineering',
          status: 'Active',
          preset_password: 'password123',
          salary: '$12,000/mo',
          attendance: '98.9%',
          tasks_completed: 45,
          online: true,
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
          rating: 4.9
        },
        {
          id: 'EMP-106',
          name: 'Lucas Thorne',
          email: 'lucas.thorne@taxpro.ai',
          phone: '+1 (555) 789-0123',
          role: 'Financial Operations Lead',
          department: 'Finance',
          status: 'Active',
          preset_password: 'password123',
          salary: '$10,800/mo',
          attendance: '97.4%',
          tasks_completed: 33,
          online: true,
          avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
          rating: 4.7
        }
      ];

      for (const m of defaultMembers) {
        await query(`
          INSERT INTO team_members (id, name, email, phone, role, department, status, preset_password, salary, attendance, tasks_completed, online, avatar, rating)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (email) DO NOTHING;
        `, [m.id, m.name, m.email, m.phone, m.role, m.department, m.status, m.preset_password, m.salary, m.attendance, m.tasks_completed, m.online, m.avatar, m.rating]);
      }
    }

    // 3. Seed Core Standard Departments (if empty)
    const deptCount = await query('SELECT COUNT(*) FROM departments');
    if (parseInt(deptCount.rows[0].count, 10) === 0) {
      console.log('[PostgreSQL Engine] Initializing core departments...');
      const defaultDepts = [
        { name: 'Taxation & Filing', manager: 'Tax Lead', initials: 'TF', description: 'Direct & Indirect Tax Returns, GST, TDS filing' },
        { name: 'Corporate Audit', manager: 'Audit Lead', initials: 'CA', description: 'Statutory, Internal, and Forensic Accounting Audits' },
        { name: 'Financial Planning', manager: 'Finance Lead', initials: 'FP', description: 'Portfolio management, forecasting, and investment analysis' },
        { name: 'Advisory & Legal', manager: 'Advisory Lead', initials: 'AL', description: 'Regulatory consulting and compliance advisory' }
      ];

      for (const d of defaultDepts) {
        await query(`
          INSERT INTO departments (name, manager, initials, description)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (name) DO NOTHING;
        `, [d.name, d.manager, d.initials, d.description]);
      }
    }

  } catch (err) {
    console.error('[PostgreSQL Engine] Seeding warning:', err.message);
  }
}
