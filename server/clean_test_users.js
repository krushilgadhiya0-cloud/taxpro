import { query } from './db.js';

async function clean() {
  const emails = ['fak59640@gmail.com', 'harsh675790@gmail.com', 'krushilgadhiya138@gmail.com'];
  for (const email of emails) {
    await query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    await query('DELETE FROM team_members WHERE LOWER(email) = LOWER($1)', [email]);
  }
  console.log('Cleaned test emails successfully from users and team_members!');
  process.exit(0);
}

clean();
