import { NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';

export async function GET() {
  try {
    const memberPercentages = await dbAll<{
      id: number;
      name: string;
      photo: string | null;
      total_days: number;
      present_days: number;
    }>(`
      SELECT m.id, m.name, m.photo,
             COUNT(a.id) as total_days,
             SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_days
      FROM members m
      LEFT JOIN attendance a ON m.id = a.member_id
      GROUP BY m.id, m.name, m.photo
    `);

    const memberSummary = memberPercentages.map((m) => ({
      id: m.id,
      name: m.name,
      photo: m.photo,
      total_days: m.total_days,
      present_days: m.present_days,
      percentage: m.total_days > 0 ? Math.round((m.present_days / m.total_days) * 100) : 100,
    }));

    const dailyStats = await dbAll(`
      SELECT attendance_date,
             SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_count,
             SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_count
      FROM attendance
      GROUP BY attendance_date
      ORDER BY attendance_date DESC
    `);

    return NextResponse.json({ members: memberSummary, dailyStats });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
