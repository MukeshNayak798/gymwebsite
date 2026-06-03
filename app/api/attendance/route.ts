import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun, updateStatusesAndOverdues } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Attendance list for a specific date
export async function GET(request: NextRequest) {
  try {
    await updateStatusesAndOverdues();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const attendanceRecords = await dbAll<{ member_id: number; status: string }>(
      `SELECT member_id, status FROM attendance WHERE attendance_date = ?`,
      [date]
    );

    const activeMembers = await dbAll<{ id: number; name: string; status: string; photo: string | null }>(
      `SELECT id, name, status, photo FROM members WHERE status IN ('Active', 'Expiring Soon')`
    );

    const recordsMap: Record<number, string> = {};
    attendanceRecords.forEach((r) => {
      recordsMap[r.member_id] = r.status;
    });

    const results = activeMembers.map((m) => ({
      member_id: m.id,
      name: m.name,
      status: m.status,
      photo: m.photo,
      attendance: recordsMap[m.id] || null,
    }));

    return NextResponse.json(results);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST: Save attendance for a specific date
export async function POST(request: NextRequest) {
  try {
    const { date, records } = await request.json();

    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Date and records array are required.' }, { status: 400 });
    }

    for (const record of records as { member_id: number; status: string | null }[]) {
      const { member_id, status } = record;

      if (status === null || status === '') {
        await dbRun(`DELETE FROM attendance WHERE member_id = ? AND attendance_date = ?`, [member_id, date]);
      } else {
        const existing = await dbGet<{ id: number } | undefined>(
          `SELECT id FROM attendance WHERE member_id = ? AND attendance_date = ?`,
          [member_id, date]
        );

        if (existing) {
          await dbRun(`UPDATE attendance SET status = ? WHERE id = ?`, [status, existing.id]);
        } else {
          await dbRun(`INSERT INTO attendance (member_id, attendance_date, status) VALUES (?, ?, ?)`, [member_id, date, status]);
        }
      }
    }

    return NextResponse.json({ message: 'Attendance saved successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
