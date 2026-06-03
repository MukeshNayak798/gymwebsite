import { NextResponse } from 'next/server';
import { updateStatusesAndOverdues } from '@/lib/db';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    await updateStatusesAndOverdues();

    const totalMembers = await sql`SELECT COUNT(*) as count FROM members`;
    const activeMembers = await sql`SELECT COUNT(*) as count FROM members WHERE status IN ('Active', 'Expiring Soon')`;
    const expiredMembers = await sql`SELECT COUNT(*) as count FROM members WHERE status = 'Expired'`;
    const pendingPayments = await sql`SELECT COUNT(*) as count FROM payments WHERE payment_status IN ('Pending', 'Overdue')`;

    const expiredAlerts = await sql`SELECT id, name, phone, expiry_date, status, photo FROM members WHERE status = 'Expired' ORDER BY expiry_date DESC`;
    const expiringAlerts = await sql`SELECT id, name, phone, expiry_date, status, photo FROM members WHERE status = 'Expiring Soon' ORDER BY expiry_date ASC`;
    const paymentAlerts = await sql`
      SELECT p.id as payment_id, m.name as member_name, m.phone, p.amount, p.due_date, p.payment_status, m.plan_duration, m.photo as member_photo
      FROM payments p
      JOIN members m ON p.member_id = m.id
      WHERE p.payment_status IN ('Pending', 'Overdue')
      ORDER BY p.due_date ASC
    `;

    const weeklyAttendance = await sql`
      SELECT attendance_date, COUNT(*) as present_count
      FROM attendance
      WHERE status = 'Present'
      GROUP BY attendance_date
      ORDER BY attendance_date DESC
      LIMIT 7
    `;
    const wRows = [...weeklyAttendance.rows].reverse();

    const revenueTrend = await sql`
      SELECT TO_CHAR(payment_date::date, 'YYYY-MM') as month, SUM(amount) as total_revenue
      FROM payments
      WHERE payment_status = 'Paid' AND payment_date IS NOT NULL
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `;
    const rRows = [...revenueTrend.rows].reverse();

    return NextResponse.json({
      stats: {
        total: parseInt(totalMembers.rows[0].count),
        active: parseInt(activeMembers.rows[0].count),
        expired: parseInt(expiredMembers.rows[0].count),
        pendingPayments: parseInt(pendingPayments.rows[0].count),
      },
      alerts: {
        expired: expiredAlerts.rows,
        expiringSoon: expiringAlerts.rows,
        pendingPayments: paymentAlerts.rows,
      },
      charts: {
        attendance: wRows,
        revenue: rRows,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
