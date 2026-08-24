import { query } from './db.js';

async function seedRichDummyData() {
  console.log('=================================================================');
  console.log('🚀 SEEDING TAXPRO PRACTICE PMS WITH RICH DUMMY DATA');
  console.log('=================================================================');

  // 1. SEED CLIENTS
  console.log('\n[1/7] Seeding Corporate Clients Dossiers...');
  const clients = [
    {
      id: 'CLI-1001',
      name: 'Reliance Retail Ventures Ltd',
      trade_name: 'Reliance Retail',
      contact_person: 'Mr. Mukesh Ambani / CFO Desk',
      email: 'finance@relianceretail.com',
      phone: '+91 98201 12345',
      pan: 'AABCR1234F',
      gst: '24AABCR1234F1Z9',
      status: 'Active',
      category: 'Corporate Statutory Audit',
      address: 'Maker Chambers IV, Nariman Point, Mumbai - 400021'
    },
    {
      id: 'CLI-1002',
      name: 'Infosys BPM Solutions Pvt Ltd',
      trade_name: 'Infosys BPM',
      contact_person: 'Ms. Sudha Murthy / Tax Dept',
      email: 'taxation@infosysbpm.com',
      phone: '+91 98450 67890',
      pan: 'AAACI4567K',
      gst: '29AAACI4567K1Z4',
      status: 'Active',
      category: 'GST & Transfer Pricing',
      address: 'Electronics City, Hosur Road, Bengaluru - 560100'
    },
    {
      id: 'CLI-1003',
      name: 'Tata Advanced Systems Ltd',
      trade_name: 'Tata Systems',
      contact_person: 'Mr. N. Chandrasekaran / Finance Lead',
      email: 'compliance@tatasystems.com',
      phone: '+91 98110 54321',
      pan: 'AAACT8901L',
      gst: '27AAACT8901L1Z2',
      status: 'Active',
      category: 'Direct Tax & Litigation',
      address: 'Bombay House, Homi Mody Street, Mumbai - 400001'
    },
    {
      id: 'CLI-1004',
      name: 'Sharma Healthcare & Pharmaceuticals',
      trade_name: 'Sharma Healthcare',
      contact_person: 'Dr. Alok Sharma',
      email: 'accounts@sharmahealth.in',
      phone: '+91 97234 56789',
      pan: 'AABPS2345M',
      gst: '24AABPS2345M1Z8',
      status: 'Active',
      category: 'Income Tax & Bookkeeping',
      address: 'Ring Road, Surat, Gujarat - 395002'
    },
    {
      id: 'CLI-1005',
      name: 'Apex Global Logistics & Freight',
      trade_name: 'Apex Logistics',
      contact_person: 'Mr. Rajesh Varma',
      email: 'cfo@apexlogistics.in',
      phone: '+91 98980 11223',
      pan: 'AAGCA3456P',
      gst: '24AAGCA3456P1Z3',
      status: 'Active',
      category: 'Customs & GST Compliance',
      address: 'Mundra Port SEZ, Kutch, Gujarat - 370421'
    }
  ];

  for (const c of clients) {
    await query(`
      INSERT INTO clients (id, name, trade_name, contact_person, email, phone, pan, gst, status, category, address, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        trade_name = EXCLUDED.trade_name,
        contact_person = EXCLUDED.contact_person,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        pan = EXCLUDED.pan,
        gst = EXCLUDED.gst,
        status = EXCLUDED.status,
        category = EXCLUDED.category,
        address = EXCLUDED.address;
    `, [c.id, c.name, c.trade_name, c.contact_person, c.email, c.phone, c.pan, c.gst, c.status, c.category, c.address]);
  }
  console.log(`✓ Inserted ${clients.length} Corporate Clients.`);

  // 2. SEED TEAM MEMBERS
  console.log('\n[2/7] Seeding Practice Staff & Specialists...');
  const members = [
    {
      id: 'EMP-026',
      name: 'Krushil Gadhiya',
      email: 'krushilgadhiya138@gmail.com',
      phone: '+91 99000 11222',
      role: 'Administrator',
      department: 'Executive Governance',
      status: 'Active',
      salary: '₹1,50,000/mo',
      preset_password: 'Krushil@2007',
      tasks_completed: 48,
      online: true,
      rating: 5.0
    },
    {
      id: 'EMP-102',
      name: 'Priya Patel',
      email: 'priya.patel@taxpro.com',
      phone: '+91 98222 33444',
      role: 'Manager',
      department: 'Direct Tax & GST Advisory',
      status: 'Active',
      salary: '₹85,000/mo',
      preset_password: 'TaxPro@2026Manager',
      tasks_completed: 32,
      online: true,
      rating: 4.9
    },
    {
      id: 'EMP-103',
      name: 'Aarav Mehta',
      email: 'aarav.mehta@taxpro.com',
      phone: '+91 97333 44555',
      role: 'Senior Associate',
      department: 'Audit & Statutory Assurance',
      status: 'Active',
      salary: '₹65,000/mo',
      preset_password: 'TaxPro@2026Audit',
      tasks_completed: 27,
      online: false,
      rating: 4.8
    },
    {
      id: 'EMP-104',
      name: 'Ananya Deshmukh',
      email: 'ananya.d@taxpro.com',
      phone: '+91 96444 55666',
      role: 'Consultant',
      department: 'ROC & Corporate Filings',
      status: 'Active',
      salary: '₹55,000/mo',
      preset_password: 'TaxPro@2026ROC',
      tasks_completed: 19,
      online: true,
      rating: 4.7
    },
    {
      id: 'EMP-105',
      name: 'Vikram Singhania',
      email: 'vikram.s@taxpro.com',
      phone: '+91 95555 66777',
      role: 'Associate',
      department: 'Payroll & Bookkeeping',
      status: 'Pending Invite',
      salary: '₹45,000/mo',
      preset_password: 'TaxPro@2026Payroll',
      tasks_completed: 12,
      online: false,
      rating: 4.6
    }
  ];

  for (const m of members) {
    await query(`
      INSERT INTO team_members (id, name, email, phone, role, department, status, salary, preset_password, tasks_completed, online, rating, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        department = EXCLUDED.department,
        status = EXCLUDED.status,
        salary = EXCLUDED.salary,
        preset_password = EXCLUDED.preset_password,
        tasks_completed = EXCLUDED.tasks_completed,
        online = EXCLUDED.online,
        rating = EXCLUDED.rating;
    `, [m.id, m.name, m.email, m.phone, m.role, m.department, m.status, m.salary, m.preset_password, m.tasks_completed, m.online, m.rating]);

    await query(`
      INSERT INTO users (id, email, password, name, role, phone, company, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        status = EXCLUDED.status;
    `, [`USR-${m.id}`, m.email, m.preset_password, m.name, m.role, m.phone, 'TaxPro Advisory & Tax Associates', 'Active']);
  }
  console.log(`✓ Inserted ${members.length} Team Members & User Logins.`);

  // 3. SEED PROJECTS
  console.log('\n[3/7] Seeding Corporate Practice Projects...');
  const projects = [
    {
      id: 'PRJ-201',
      name: 'FY 2025-26 Statutory Audit & Tax Filing',
      client_name: 'Reliance Retail Ventures Ltd',
      client_id: 'CLI-1001',
      deadline: '2026-09-30',
      status: 'In Progress',
      priority: 'High',
      budget: '₹4,50,000',
      progress: 65,
      lead: 'Krushil Gadhiya'
    },
    {
      id: 'PRJ-202',
      name: 'Monthly GSTR-3B & GSTR-1 Reconciliation',
      client_name: 'Infosys BPM Solutions Pvt Ltd',
      client_id: 'CLI-1002',
      deadline: '2026-09-20',
      status: 'In Progress',
      priority: 'High',
      budget: '₹2,20,000',
      progress: 80,
      lead: 'Priya Patel'
    },
    {
      id: 'PRJ-203',
      name: 'Transfer Pricing Documentation & 3CEB Study',
      client_name: 'Tata Advanced Systems Ltd',
      client_id: 'CLI-1003',
      deadline: '2026-10-31',
      status: 'Planning',
      priority: 'Medium',
      budget: '₹6,00,000',
      progress: 25,
      lead: 'Krushil Gadhiya'
    },
    {
      id: 'PRJ-204',
      name: 'Annual ROC Compliance Form AOC-4 & MGT-7',
      client_name: 'Sharma Healthcare & Pharmaceuticals',
      client_id: 'CLI-1004',
      deadline: '2026-10-15',
      status: 'In Progress',
      priority: 'Medium',
      budget: '₹1,50,000',
      progress: 50,
      lead: 'Ananya Deshmukh'
    }
  ];

  for (const p of projects) {
    await query(`
      INSERT INTO projects (id, name, client_name, client_id, deadline, status, priority, budget, progress, lead, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        client_name = EXCLUDED.client_name,
        deadline = EXCLUDED.deadline,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        budget = EXCLUDED.budget,
        progress = EXCLUDED.progress,
        lead = EXCLUDED.lead;
    `, [p.id, p.name, p.client_name, p.client_id, p.deadline, p.status, p.priority, p.budget, p.progress, p.lead]);
  }
  console.log(`✓ Inserted ${projects.length} Practice Projects.`);

  // 4. SEED GLOBAL TASKS
  console.log('\n[4/7] Seeding Workflow Tasks...');
  const tasks = [
    {
      id: 'TSK-501',
      title: 'Verify Input Tax Credit 2B vs Purchase Register',
      project_id: 'PRJ-202',
      assignee: 'Priya Patel',
      client: 'Infosys BPM Solutions Pvt Ltd',
      client_id: 'CLI-1002',
      due_date: '2026-08-28',
      priority: 'High',
      status: 'In Progress',
      category: 'GST'
    },
    {
      id: 'TSK-502',
      title: 'Draft Form 3CD Clauses 21(a) & 40 Disallowances',
      project_id: 'PRJ-201',
      assignee: 'Aarav Mehta',
      client: 'Reliance Retail Ventures Ltd',
      client_id: 'CLI-1001',
      due_date: '2026-09-05',
      priority: 'High',
      status: 'In Progress',
      category: 'Direct Tax'
    },
    {
      id: 'TSK-503',
      title: 'Compute Advance Tax Q2 Installment Liability',
      project_id: 'PRJ-203',
      assignee: 'Krushil Gadhiya',
      client: 'Tata Advanced Systems Ltd',
      client_id: 'CLI-1003',
      due_date: '2026-09-15',
      priority: 'High',
      status: 'Pending',
      category: 'Advisory'
    },
    {
      id: 'TSK-504',
      title: 'Upload Director KYC Form DIR-3 KYC on MCA Portal',
      project_id: 'PRJ-204',
      assignee: 'Ananya Deshmukh',
      client: 'Sharma Healthcare & Pharmaceuticals',
      client_id: 'CLI-1004',
      due_date: '2026-09-30',
      priority: 'Medium',
      status: 'Completed',
      category: 'ROC'
    }
  ];

  for (const t of tasks) {
    await query(`
      INSERT INTO global_tasks (id, title, project_id, assignee, client, client_id, due_date, priority, status, category, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        assignee = EXCLUDED.assignee,
        client = EXCLUDED.client,
        due_date = EXCLUDED.due_date,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        category = EXCLUDED.category;
    `, [t.id, t.title, t.project_id, t.assignee, t.client, t.client_id, t.due_date, t.priority, t.status, t.category]);
  }
  console.log(`✓ Inserted ${tasks.length} Compliance Tasks.`);

  // 5. SEED AUDIT LOGS
  console.log('\n[5/7] Seeding Enterprise Audit Logs...');
  const auditLogs = [
    {
      id: `AUD-${Date.now()}-1`,
      action: 'CLIENT_DOSSIER_ACCESSED',
      module: 'Clients',
      details: 'Reviewed GSTIN filing history and Form 2B for Reliance Retail Ventures Ltd',
      user_email: 'krushilgadhiya138@gmail.com',
      user_name: 'Krushil Gadhiya',
      user_role: 'Administrator'
    },
    {
      id: `AUD-${Date.now()}-2`,
      action: 'INVOICE_GENERATED',
      module: 'Financials',
      details: 'Generated Tax Invoice INV/2026/083 for Tata Advanced Systems Ltd (₹7,08,000)',
      user_email: 'krushilgadhiya138@gmail.com',
      user_name: 'Krushil Gadhiya',
      user_role: 'Administrator'
    },
    {
      id: `AUD-${Date.now()}-3`,
      action: 'TEAM_MEMBER_INVITED',
      module: 'Team',
      details: 'Dispatched automated onboarding invitation to Vikram Singhania (Payroll Associate)',
      user_email: 'krushilgadhiya138@gmail.com',
      user_name: 'Krushil Gadhiya',
      user_role: 'Administrator'
    },
    {
      id: `AUD-${Date.now()}-4`,
      action: 'FIRM_PROFILE_UPDATED',
      module: 'Settings',
      details: 'Updated official practice badge [TaxPro] and GSTIN [24AAAAA0000A1Z5]',
      user_email: 'krushilgadhiya138@gmail.com',
      user_name: 'Krushil Gadhiya',
      user_role: 'Administrator'
    }
  ];

  for (const a of auditLogs) {
    await query(`
      INSERT INTO audit_logs (id, action, module, details, user_email, user_name, user_role, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());
    `, [a.id, a.action, a.module, a.details, a.user_email, a.user_name, a.user_role]);
  }
  console.log(`✓ Inserted ${auditLogs.length} Audit Activity Logs.`);

  // 6. SEED FIRM PROFILE
  console.log('\n[6/7] Seeding Practice Firm Profile...');
  await query(`
    INSERT INTO app_storage (key, data, updated_at)
    VALUES ('firm_profile', $1, NOW())
    ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data;
  `, [JSON.stringify({
    name: 'TaxPro Advisory & Tax Associates',
    tag: 'TaxPro',
    gst: '24AAAAA0000A1Z5',
    pan: 'AAATF1234C',
    email: 'krushilgadhiya138@gmail.com',
    phone: '+91 99000 11222',
    address: 'Suite 401-405, Executive Chambers, Ring Road, Surat, Gujarat - 395002',
    tagline: 'Chartered Accountants & Enterprise Tax Advisory Practice'
  })]);
  console.log('✓ Configured Practice Firm Profile.');

  console.log('\n=================================================================');
  console.log('✅ ALL PRACTICE DUMMY DATA SEEDED SUCCESSFULLY!');
  console.log('=================================================================');
}

seedRichDummyData();
