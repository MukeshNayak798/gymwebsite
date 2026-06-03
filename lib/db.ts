import { sql } from '@vercel/postgres';

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

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      age INTEGER,
      gender VARCHAR(50),
      phone VARCHAR(50),
      address TEXT,
      height REAL,
      weight REAL,
      join_date VARCHAR(50),
      plan_type VARCHAR(50),
      plan_duration VARCHAR(50),
      expiry_date VARCHAR(50),
      status VARCHAR(50),
      photo TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      member_id INTEGER,
      attendance_date VARCHAR(50),
      status VARCHAR(50),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      member_id INTEGER,
      amount REAL,
      payment_date VARCHAR(50),
      due_date VARCHAR(50),
      payment_status VARCHAR(50),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS renewals (
      id SERIAL PRIMARY KEY,
      member_id INTEGER,
      old_expiry_date VARCHAR(50),
      new_expiry_date VARCHAR(50),
      renewed_on VARCHAR(50),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `;

  const countResult = await sql`SELECT COUNT(*) as count FROM members`;
  if (countResult.rows[0].count === '0') {
    console.log('Database is empty.');
  } else {
    console.log('Database already has data.');
  }
}

export async function updateStatusesAndOverdues() {
  await ensureDbInitialized();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayParts = todayStr.split('-');
  const today = new Date(
    Date.UTC(parseInt(todayParts[0], 10), parseInt(todayParts[1], 10) - 1, parseInt(todayParts[2], 10))
  );

  await sql`
    UPDATE payments SET payment_status = 'Overdue' WHERE payment_status = 'Pending' AND due_date < ${todayStr}
  `;

  const purgeDate = new Date(today.getTime());
  purgeDate.setUTCDate(today.getUTCDate() - 30);
  const pY = purgeDate.getUTCFullYear();
  const pM = String(purgeDate.getUTCMonth() + 1).padStart(2, '0');
  const pD = String(purgeDate.getUTCDate()).padStart(2, '0');
  const purgeDateStr = `${pY}-${pM}-${pD}`;
  
  await sql`DELETE FROM attendance WHERE attendance_date < ${purgeDateStr}`;

  const members = await sql`SELECT id, expiry_date FROM members`;
  for (const m of members.rows) {
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

    await sql`UPDATE members SET status = ${newStatus} WHERE id = ${m.id}`;
  }
}
