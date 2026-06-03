import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// In production (Vercel), use /tmp which is writable.
// In development, use the gym.db file at the project root.
function getDbPath(): string {
  if (process.env.NODE_ENV === 'production') {
    const tmpPath = '/tmp/gym.db';
    // Copy the bundled gym.db to /tmp on cold start if it doesn't exist
    if (!fs.existsSync(tmpPath)) {
      const sourcePath = path.join(process.cwd(), 'gym.db');
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, tmpPath);
        console.log('Copied gym.db to /tmp/gym.db');
      }
    }
    return tmpPath;
  }
  return path.join(process.cwd(), 'gym.db');
}

// Singleton db instance
let _db: sqlite3.Database | null = null;
let _isInitialized = false;
let _initPromise: Promise<void> | null = null;

function getDb(): sqlite3.Database {
  if (!_db) {
    const dbPath = getDbPath();
    _db = new sqlite3.Database(dbPath);
  }
  return _db;
}

// Helper function to run a query (INSERT, UPDATE, DELETE)
export const dbRun = async (sql: string, params: unknown[] = []): Promise<sqlite3.RunResult> => {
  await ensureDbInitialized();
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// Helper function to get multiple rows
export const dbAll = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> => {
  await ensureDbInitialized();
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};

// Helper function to get a single row
export const dbGet = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> => {
  await ensureDbInitialized();
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
};

export const ensureDbInitialized = async () => {
  if (_isInitialized) return;
  if (!_initPromise) {
    _initPromise = initDb().then(() => {
      _isInitialized = true;
    });
  }
  return _initPromise;
};

// Initialize DB schema
export async function initDb() {
  const db = getDb();
  
  const runQuery = (sql: string, params: unknown[] = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

  const getQuery = <T>(sql: string, params: unknown[] = []): Promise<T> => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });

  await runQuery('PRAGMA foreign_keys = ON');

  // Create Members table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS members (
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
    )
  `);

  // Migrate table schema dynamically to support photo if table existed without it
  try {
    await runQuery('ALTER TABLE members ADD COLUMN photo TEXT');
    console.log('Database migrated: added photo column to members table.');
  } catch {
    // Column already exists, ignore
  }

  // Migrate table schema dynamically to support plan_type if table existed without it
  try {
    await runQuery('ALTER TABLE members ADD COLUMN plan_type TEXT');
    console.log('Database migrated: added plan_type column to members table.');
  } catch {
    // Column already exists, ignore
  }

  // Create Attendance table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      attendance_date TEXT,
      status TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  // Create Payments table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      amount REAL,
      payment_date TEXT,
      due_date TEXT,
      payment_status TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  // Create Renewals table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS renewals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      old_expiry_date TEXT,
      new_expiry_date TEXT,
      renewed_on TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  const countRow = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM members');
  if (countRow?.count === 0) {
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
    \`UPDATE payments SET payment_status = 'Overdue' WHERE payment_status = 'Pending' AND due_date < ?\`,
    [todayStr]
  );

  // Purge attendance records older than 30 days relative to today
  const purgeDate = new Date(today.getTime());
  purgeDate.setUTCDate(today.getUTCDate() - 30);
  const pY = purgeDate.getUTCFullYear();
  const pM = String(purgeDate.getUTCMonth() + 1).padStart(2, '0');
  const pD = String(purgeDate.getUTCDate()).padStart(2, '0');
  const purgeDateStr = \`\${pY}-\${pM}-\${pD}\`;
  await dbRun('DELETE FROM attendance WHERE attendance_date < ?', [purgeDateStr]);

  // Fetch all members to update status
  const members = await dbAll<{ id: number; expiry_date: string }>('SELECT id, expiry_date FROM members');
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

    await dbRun('UPDATE members SET status = ? WHERE id = ?', [newStatus, m.id]);
  }
}
