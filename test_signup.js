import axios from 'axios';

async function testPostgresSignup() {
  const testEmail = `test.taxpro.${Date.now()}@gmail.com`;
  console.log(`[PostgreSQL Diagnostic] Testing Direct PostgreSQL Signup with: ${testEmail}`);

  try {
    const res = await axios.post('http://localhost:5000/api/auth/signup', {
      email: testEmail,
      password: 'SecurePassword123!',
      name: 'Test Administrator',
      role: 'Administrator',
      department: 'Executive Management'
    });

    console.log('[PostgreSQL Test Passed]:', res.data);
  } catch (error) {
    console.error('[PostgreSQL Test Error]:', error.response ? error.response.data : error.message);
  }
}

testPostgresSignup();
