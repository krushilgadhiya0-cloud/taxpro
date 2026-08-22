// Compatibility proxy mapping legacy imports to pure native PostgreSQL Client
import postgresClient, { db, supabase as pgSupabase } from './postgresClient';

export { db, postgresClient };
export const supabase = postgresClient;
export default postgresClient;
