import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testSignup() {
  const testEmail = `test.taxpro.${Date.now()}@gmail.com`;
  console.log(`[TEST] Attempting SignUp with: ${testEmail}`);

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: 'SecurePassword123!',
  });

  if (error) {
    console.error("[TEST FAILED]", error.message);
  } else {
    console.log("[TEST PASSED]", "Response properties:", Object.keys(data));
    console.log("User Object:", data.user ? "Exists" : "Null");
  }
}

testSignup();
