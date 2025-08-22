import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './schema';

// Configure WebSocket constructor for Node.js environments
if (typeof global !== 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

declare global {
  // eslint-disable-next-line no-var
  var db: ReturnType<typeof drizzle> | undefined;
}

// Create database connection
const createDbConnection = () => {
  const sql = neon(process.env.POSTGRES_URL!);
  return drizzle(sql, { schema });
};

// Use singleton pattern to avoid multiple connections in development
const db = globalThis.db ?? createDbConnection();

if (process.env.NODE_ENV !== 'production') {
  globalThis.db = db;
}

export default db;

// Export types for convenience
export type {
  User,
  Customer,
  Invoice,
  Revenue,
  NewUser,
  NewCustomer, 
  NewInvoice,
  NewRevenue,
} from './schema';