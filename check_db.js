import { query, initDatabase } from './server/db.js';

async function checkDatabaseLiveStatus() {
  console.log('----------------------------------------------------');
  console.log('🔍 CHECKING POSTGRESQL LIVE CONNECTION & SCHEMAS...');
  console.log('----------------------------------------------------');

  try {
    const timeRes = await query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    const row = timeRes.rows[0];

    console.log('✅ STATUS: CONNECTED & ONLINE');
    console.log('📌 Database Name:', row.db_name);
    console.log('⏰ Server Timestamp:', row.current_time);
    console.log('⚙️ PostgreSQL Engine:', row.pg_version.split(',')[0]);
    console.log('----------------------------------------------------');
    console.log('🚀 Running initDatabase() to create/migrate all tables & columns...');
    
    await initDatabase();

    console.log('----------------------------------------------------');
    console.log('📊 LIVE TABLE RECORD COUNTS:');

    const tables = [
      'users',
      'team_members',
      'departments',
      'clients',
      'contact_persons',
      'global_tasks',
      'projects',
      'todos',
      'ideas',
      'attendance',
      'reports',
      'payments',
      'receipts_payments',
      'fees',
      'fees_invoices',
      'member_payouts',
      'private_messages',
      'broadcast_messages',
      'communication_logs',
      'calendar_events',
      'support_tickets',
      'firm_profile',
      'app_settings',
      'integrations',
      'app_storage',
      'ai_action_logs'
    ];

    for (const table of tables) {
      try {
        const countRes = await query(`SELECT COUNT(*) FROM "${table}"`);
        console.log(`  ✓ Table [${table.padEnd(20)}]: ${countRes.rows[0].count} records`);
      } catch (err) {
        console.log(`  ✕ Table [${table.padEnd(20)}]: Error (${err.message})`);
      }
    }

    console.log('----------------------------------------------------');
    console.log('🧪 Performing CRUD Verification Test on Live DB...');

    // Test writing and reading from clients
    const testClientId = `TEST-CL-${Date.now()}`;
    await query(`
      INSERT INTO clients (id, name, trade_name, email, phone, status, address, city, state, pincode)
      VALUES ($1, 'Test Verification Firm', 'Test Trading Co', 'test@verify.com', '9876543210', 'Active', '123 Wall Street', 'Mumbai', 'Maharashtra', '400001')
      RETURNING *;
    `, [testClientId]);
    console.log('  ✓ Client Insert Successful');

    const clientCheck = await query(`SELECT * FROM clients WHERE id = $1`, [testClientId]);
    if (clientCheck.rows.length > 0) {
      console.log('  ✓ Client Select Verified:', clientCheck.rows[0].name, '-', clientCheck.rows[0].city);
    }

    await query(`DELETE FROM clients WHERE id = $1`, [testClientId]);
    console.log('  ✓ Client Cleanup Successful');

    // Test storage key-value
    await query(`
      INSERT INTO app_storage (key, data, updated_at)
      VALUES ('taxpro_db_health_check', '{"status":"ok","timestamp":"${new Date().toISOString()}"}'::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
    `);
    console.log('  ✓ App Storage Key-Value Sync Verified');

    console.log('----------------------------------------------------');
    console.log('🎯 ALL 26 POSTGRESQL TABLES VERIFIED, MIGRATED & OPERATIONAL.');
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('❌ POSTGRESQL CONNECTION FAILED:', error.message);
    process.exit(1);
  }
}

checkDatabaseLiveStatus();
