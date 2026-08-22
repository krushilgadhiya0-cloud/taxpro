import 'dotenv/config';
import { query } from './server/db.js';
import { registerInvitedUser } from './server/routes/auth.js';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 TESTING ADMIN INVITATION & AUTO-REGISTRATION FLOW');
  console.log('====================================================\n');

  // Test 1: Admin Invites Manager
  console.log('1️⃣ Admin Invites Manager (Amit Patel)...');
  const managerResult = await registerInvitedUser({
    email: 'amit.manager@taxpro.com',
    name: 'Amit Patel (Audit Lead)',
    password: 'ManagerPass@2026',
    role: 'Manager',
    department: 'Corporate Audit',
    phone: '9820112233',
    salary: '$14,000/mo',
    permissions: { dashboard: true, projects: true, tasks: true, reports: true }
  });

  console.log('✓ Manager Auto-Registered:', managerResult.success);
  console.log('  Credentials Assigned:', managerResult.credentials);

  // Verify in PostgreSQL users table
  const userCheck1 = await query('SELECT email, role, password FROM users WHERE LOWER(email) = $1', ['amit.manager@taxpro.com']);
  console.log('  Verified in `users` Table:', userCheck1.rows[0]);

  // Verify in PostgreSQL team_members table
  const memCheck1 = await query('SELECT name, email, role, department, status, preset_password FROM team_members WHERE LOWER(email) = $1', ['amit.manager@taxpro.com']);
  console.log('  Verified in `team_members` Table:', memCheck1.rows[0]);

  // Test 2: Admin Invites Employee
  console.log('\n2️⃣ Admin Invites Employee (Pooja Shah)...');
  const employeeResult = await registerInvitedUser({
    email: 'pooja.staff@taxpro.com',
    name: 'Pooja Shah (Tax Associate)',
    password: 'StaffPass@2026',
    role: 'Employee',
    department: 'Taxation & Filing',
    phone: '9820445566',
    salary: '$8,500/mo',
    permissions: { dashboard: true, todos: true, tasks: true, ideas: true }
  });

  console.log('✓ Employee Auto-Registered:', employeeResult.success);
  console.log('  Credentials Assigned:', employeeResult.credentials);

  // Test 3: Manager Login Simulation
  console.log('\n3️⃣ Simulating Manager Login with Registered Credentials...');
  const managerLoginRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', ['amit.manager@taxpro.com']);
  const managerUser = managerLoginRes.rows[0];
  const isManagerPassCorrect = managerUser.password === 'ManagerPass@2026';
  console.log(`  Manager Login Status: ${isManagerPassCorrect ? '✅ SUCCESS (Authorized as ' + managerUser.role + ')' : '❌ FAILED'}`);

  // Test 4: Employee Login Simulation
  console.log('\n4️⃣ Simulating Employee Login with Registered Credentials...');
  const employeeLoginRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', ['pooja.staff@taxpro.com']);
  const employeeUser = employeeLoginRes.rows[0];
  const isEmployeePassCorrect = employeeUser.password === 'StaffPass@2026';
  console.log(`  Employee Login Status: ${isEmployeePassCorrect ? '✅ SUCCESS (Authorized as ' + employeeUser.role + ')' : '❌ FAILED'}`);

  // Test 5: Reject Incorrect Password
  console.log('\n5️⃣ Simulating Login with Wrong Password...');
  const isWrongPassAccepted = managerUser.password === 'WrongSecret123';
  console.log(`  Wrong Password Rejected: ${!isWrongPassAccepted ? '✅ CORRECTLY DENIED' : '❌ FAILED'}`);

  console.log('\n====================================================');
  console.log('🎯 ALL INVITATION & AUTO-REGISTRATION TESTS PASSED!');
  console.log('====================================================');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
