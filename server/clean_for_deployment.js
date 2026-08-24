import { query } from './db.js';

async function purgeAndResetDatabase() {
  console.log('[Deployment Cleanup] Starting comprehensive data purge & reset...');

  try {
    // 1. Truncate / clear operational test tables
    const tablesToTruncate = [
      'clients',
      'contact_persons',
      'global_tasks',
      'projects',
      'todos',
      'ideas',
      'attendance',
      'reports',
      'receipts_payments',
      'payroll_records',
      'invoices',
      'private_messages',
      'communications',
      'support_tickets',
      'app_storage',
      'audit_logs'
    ];

    for (const tbl of tablesToTruncate) {
      try {
        await query(`TRUNCATE TABLE ${tbl} RESTART IDENTITY CASCADE`);
        console.log(`[Deployment Cleanup] ✓ Cleared table: ${tbl}`);
      } catch (err) {
        // If truncate fails due to constraints or table not existing, fallback to DELETE
        try {
          await query(`DELETE FROM ${tbl}`);
          console.log(`[Deployment Cleanup] ✓ Deleted rows from table: ${tbl}`);
        } catch (delErr) {
          console.warn(`[Deployment Cleanup Warning] Table ${tbl}: ${delErr.message}`);
        }
      }
    }

    // 2. Clean users table — Retain exclusively Super Admin & Primary Admin
    const superEmails = ['superadmin@taxpro.com', 'workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com'];
    await query(`
      DELETE FROM users 
      WHERE LOWER(email) NOT IN ($1, $2, $3);
    `, superEmails);
    console.log('[Deployment Cleanup] ✓ Cleaned users table (Retained Super Admin accounts)');

    // Ensure superadmin accounts exist with correct attributes
    await query(`
      INSERT INTO users (id, email, password, name, role, company, phone_verified, lock_pin, created_at, updated_at)
      VALUES 
        ('USR-SUPER-01', 'superadmin@taxpro.com', 'Krushil@2007', 'Super Administrator', 'Super Admin', 'TaxPro Core Suite', TRUE, '1234', NOW(), NOW()),
        ('USR-SUPER-02', 'workforcepro09@gmail.com', 'Krushil@2007', 'Root Administrator', 'Super Admin', 'TaxPro Enterprise', TRUE, '1234', NOW(), NOW()),
        ('USR-ADMIN-01', 'krushilgadhiya0@gmail.com', 'Krushil@2007', 'Krushil Gadhiya', 'Administrator', 'TaxPro Advisory', TRUE, '1234', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET 
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW();
    `);
    console.log('[Deployment Cleanup] ✓ Verified Super Admin accounts in users table');

    // 3. Clean team_members table — Retain Super Admins as active executive directory personnel
    await query(`
      DELETE FROM team_members 
      WHERE LOWER(email) NOT IN ($1, $2, $3);
    `, superEmails);

    await query(`
      INSERT INTO team_members (id, name, email, role, department, status, preset_password, salary, online, permissions, created_at, updated_at)
      VALUES 
        ('EMP-SUPER-01', 'Super Administrator', 'superadmin@taxpro.com', 'Super Admin', 'Executive Governance', 'Active', 'Krushil@2007', '$25,000/mo', TRUE, '{"dashboard":true,"clients":true,"projects":true,"tasks":true,"attendance":true,"support":true,"receipts_payments":true,"members_payment":true,"fees_tracking":true,"communication":true,"private_chat":true,"reports":true,"team_members":true,"departments":true,"integrations":true,"settings":true}'::jsonb, NOW(), NOW()),
        ('EMP-SUPER-02', 'Root Administrator', 'workforcepro09@gmail.com', 'Super Admin', 'Executive Governance', 'Active', 'Krushil@2007', '$25,000/mo', TRUE, '{"dashboard":true,"clients":true,"projects":true,"tasks":true,"attendance":true,"support":true,"receipts_payments":true,"members_payment":true,"fees_tracking":true,"communication":true,"private_chat":true,"reports":true,"team_members":true,"departments":true,"integrations":true,"settings":true}'::jsonb, NOW(), NOW()),
        ('EMP-ADMIN-01', 'Krushil Gadhiya', 'krushilgadhiya0@gmail.com', 'Administrator', 'Taxation & Audit', 'Active', 'Krushil@2007', '$20,000/mo', TRUE, '{"dashboard":true,"clients":true,"projects":true,"tasks":true,"attendance":true,"support":true,"receipts_payments":true,"members_payment":true,"fees_tracking":true,"communication":true,"private_chat":true,"reports":true,"team_members":true,"departments":true,"integrations":true,"settings":true}'::jsonb, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET 
        role = EXCLUDED.role,
        status = 'Active',
        permissions = EXCLUDED.permissions,
        updated_at = NOW();
    `);
    console.log('[Deployment Cleanup] ✓ Initialized executive team members in team_members table');

    // 4. Clean and reset departments
    try {
      await query('DELETE FROM departments');
      await query(`
        INSERT INTO departments (id, name, manager, initials, description, head_count, budget, created_at, updated_at)
        VALUES 
          ('DEPT-01', 'Executive Governance', 'Super Administrator', 'EG', 'Overall firm leadership, legal compliance, and strategic decision making', 2, '$100,000', NOW(), NOW()),
          ('DEPT-02', 'Taxation & Corporate Audit', 'Krushil Gadhiya', 'TCA', 'Direct/indirect tax filing, GST audit, statutory compliances, and returns', 1, '$75,000', NOW(), NOW()),
          ('DEPT-03', 'Financial Accounting & Payroll', 'Finance Lead', 'FAP', 'Bookkeeping, ledgers, payroll disbursement, and cashflow management', 0, '$50,000', NOW(), NOW()),
          ('DEPT-04', 'Corporate Advisory & Legal', 'Advisory Lead', 'CAL', 'Company registrations, legal documentation, and business consulting', 0, '$50,000', NOW(), NOW())
        ON CONFLICT (name) DO NOTHING;
      `);
      console.log('[Deployment Cleanup] ✓ Standardized default practice departments');
    } catch (deptErr) {
      console.warn('[Deployment Cleanup Department Warning]:', deptErr.message);
    }

    // 5. Create clean initial deployment audit log
    try {
      await query(`
        INSERT INTO audit_logs (id, user_email, user_name, action, module, details, ip_address, created_at)
        VALUES (
          'LOG-INIT-001',
          'superadmin@taxpro.com',
          'Super Administrator',
          'SYSTEM_DEPLOYMENT',
          'Core Suite',
          'TaxPro Enterprise Practice Suite cleaned and initialized for production deployment.',
          '127.0.0.1',
          NOW()
        );
      `);
      console.log('[Deployment Cleanup] ✓ Initialized baseline system audit log');
    } catch (logErr) {
      console.warn('[Deployment Cleanup Audit Log Warning]:', logErr.message);
    }

    console.log('\n=============================================================');
    console.log('✅ DATABASE SUCCESSFULLY PURGED & PREPARED FOR PRODUCTION DEPLOYMENT');
    console.log('=============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('[Deployment Cleanup Critical Error]:', err);
    process.exit(1);
  }
}

purgeAndResetDatabase();
