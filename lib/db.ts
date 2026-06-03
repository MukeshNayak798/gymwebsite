import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:gym.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let _isInitialized = false;
let _initPromise: Promise<void> | null = null;

export const ensureDbInitialized = async () => {
  if (_isInitialized) return;
  if (!_initPromise) {
    _initPromise = initDb().then(() => {
      _isInitialized = true;
    });
  }
  return _initPromise;
};

// Helper function to run a query (INSERT, UPDATE, DELETE)
export const dbRun = async (sql: string, params: unknown[] = []) => {
  await ensureDbInitialized();
  const res = await client.execute({ sql, args: params as any });
  return { lastID: Number(res.lastInsertRowid), changes: res.rowsAffected };
};

// Helper function to get multiple rows
export const dbAll = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> => {
  await ensureDbInitialized();
  const res = await client.execute({ sql, args: params as any });
  return res.rows as unknown as T[];
};

// Helper function to get a single row
export const dbGet = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> => {
  await ensureDbInitialized();
  const res = await client.execute({ sql, args: params as any });
  return res.rows[0] as unknown as T | undefined;
};

// Initialize DB schema
export async function initDb() {
  // Batch all table creation into a single network request to save time on cold starts
  await client.batch([
    'PRAGMA foreign_keys = ON',
    `CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      phone TEXT,
      address TEXT,
      height REAL,
      weight REAL,
      join_date TEXT,
      plan_type TEXT,
      plan_duration TEXT,
      expiry_date TEXT,
      status TEXT,
      photo TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      attendance_date TEXT,
      status TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      amount REAL,
      payment_date TEXT,
      due_date TEXT,
      payment_status TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS renewals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      old_expiry_date TEXT,
      new_expiry_date TEXT,
      renewed_on TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )`
  ], 'write');

  // Migrate table schema dynamically to support photo if table existed without it
  try {
    await client.execute('ALTER TABLE members ADD COLUMN photo TEXT');
    console.log('Database migrated: added photo column to members table.');
  } catch {
    // Column already exists, ignore
  }

  // Migrate table schema dynamically to support plan_type if table existed without it
  try {
    await client.execute('ALTER TABLE members ADD COLUMN plan_type TEXT');
    console.log('Database migrated: added plan_type column to members table.');
  } catch {
    // Column already exists, ignore
  }

  // (Tables were created in the batch above)

  const countRow = await client.execute('SELECT COUNT(*) as count FROM members');
  if (Number(countRow.rows[0].count) === 0) {
    console.log('Database is empty.');
  } else {
    console.log('Database already has data.');
  }
}

// Function to update member statuses and payments based on dates
export async function updateStatusesAndOverdues() {
  await ensureDbInitialized();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayParts = todayStr.split('-');
  const today = new Date(
    Date.UTC(parseInt(todayParts[0], 10), parseInt(todayParts[1], 10) - 1, parseInt(todayParts[2], 10))
  );

  // Update payment statuses to "Overdue" if due_date is past today and status is "Pending"
  await dbRun(
    `UPDATE payments SET payment_status = 'Overdue' WHERE payment_status = 'Pending' AND due_date < ?`,
    [todayStr]
  );

  // Purge attendance records older than 30 days relative to today
  const purgeDate = new Date(today.getTime());
  purgeDate.setUTCDate(today.getUTCDate() - 30);
  const pY = purgeDate.getUTCFullYear();
  const pM = String(purgeDate.getUTCMonth() + 1).padStart(2, '0');
  const pD = String(purgeDate.getUTCDate()).padStart(2, '0');
  const purgeDateStr = `${pY}-${pM}-${pD}`;
  await dbRun('DELETE FROM attendance WHERE attendance_date < ?', [purgeDateStr]);

  // Fetch all members to update status
  const members = await dbAll<{ id: number; expiry_date: string }>('SELECT id, expiry_date FROM members');
  const batchUpdates = [];

  for (const m of members) {
    if (!m.expiry_date) continue;
    const expiryParts = m.expiry_date.split('-');
    const expiry = new Date(
      Date.UTC(parseInt(expiryParts[0], 10), parseInt(expiryParts[1], 10) - 1, parseInt(expiryParts[2], 10))
    );
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let newStatus = 'Active';
    if (diffDays < 0) {
      newStatus = 'Expired';
    } else if (diffDays <= 7) {
      newStatus = 'Expiring Soon';
    }

    batchUpdates.push({
      sql: 'UPDATE members SET status = ? WHERE id = ?',
      args: [newStatus, m.id]
    });
  }

  // Execute all updates in a single network round-trip to drastically reduce latency
  if (batchUpdates.length > 0) {
    await client.batch(batchUpdates, 'write');
  }
}
