import { NextResponse } from 'next/server';
import { dbGet, dbAll, updateStatusesAndOverdues } from '@/lib/db';

export async function GET() {
  try {
    await updateStatusesAndOverdues();

    const todayStr = new Date().toISOString().split('T')[0];

    const totalMembers = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM members');
    const activeMembers = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM members WHERE status IN ('Active', 'Expiring Soon')"
    );
    const expiredMembers = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM members WHERE status = 'Expired'"
    );
    const pendingPayments = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM payments WHERE payment_status IN ('Pending', 'Overdue')"
    );

    const expiredAlerts = await dbAll(
      `SELECT id, name, phone, expiry_date, status, photo FROM members WHERE status = 'Expired' ORDER BY expiry_date DESC`
    );
    const expiringAlerts = await dbAll(
      `SELECT id, name, phone, expiry_date, status, photo FROM members WHERE status = 'Expiring Soon' ORDER BY expiry_date ASC`
    );
    const paymentAlerts = await dbAll(`
      SELECT p.id as payment_id, m.name as member_name, m.phone, p.amount, p.due_date, p.payment_status, m.plan_duration, m.photo as member_photo
      FROM payments p
      JOIN members m ON p.member_id = m.id
      WHERE p.payment_status IN ('Pending', 'Overdue')
      ORDER BY p.due_date ASC
    `);

    const weeklyAttendance = await dbAll<{ attendance_date: string; present_count: number }>(`
      SELECT attendance_date, COUNT(*) as present_count
      FROM attendance
      WHERE status = 'Present'
      GROUP BY attendance_date
      ORDER BY attendance_date DESC
      LIMIT 7
    `);
    weeklyAttendance.reverse();

    const revenueTrend = await dbAll<{ month: string; total_revenue: number }>(`
      SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as total_revenue
      FROM payments
      WHERE payment_status = 'Paid' AND payment_date IS NOT NULL
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `);
    revenueTrend.reverse();

    return NextResponse.json({
      stats: {
        total: totalMembers?.count || 0,
        active: activeMembers?.count || 0,
        expired: expiredMembers?.count || 0,
        pendingPayments: pendingPayments?.count || 0,
      },
      alerts: {
        expired: expiredAlerts,
        expiringSoon: expiringAlerts,
        pendingPayments: paymentAlerts,
      },
      charts: {
        attendance: weeklyAttendance,
        revenue: revenueTrend,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
