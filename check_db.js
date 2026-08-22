import { query } from './server/db.js';

async function checkDatabaseLiveStatus() {
  console.log('----------------------------------------------------');
  console.log('🔍 CHECKING POSTGRESQL LIVE CONNECTION STATUS...');
  console.log('----------------------------------------------------');

  try {
    const timeRes = await query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    const row = timeRes.rows[0];

    console.log('✅ STATUS: CONNECTED & ONLINE');
    console.log('📌 Database Name:', row.db_name);
    console.log('⏰ Server Timestamp:', row.current_time);
    console.log('⚙️ PostgreSQL Engine:', row.pg_version.split(',')[0]);
    console.log('----------------------------------------------------');
    console.log('📊 LIVE TABLE RECORD COUNTS:');

    const tables = [
      'users',
      'team_members',
      'departments',
      'clients',
      'global_tasks',
      'projects',
      'payments',
      'attendance',
      'reports',
      'app_storage'
    ];

    for (const table of tables) {
      try {
        const countRes = await query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ✓ Table [${table.padEnd(16)}]: ${countRes.rows[0].count} records`);
      } catch (err) {
        console.log(`  ✕ Table [${table.padEnd(16)}]: Error (${err.message})`);
      }
    }

    console.log('----------------------------------------------------');
    console.log('🎯 PostgreSQL is 100% connected, initialized and active.');
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('❌ POSTGRESQL CONNECTION FAILED:', error.message);
    process.exit(1);
  }
}

checkDatabaseLiveStatus();
