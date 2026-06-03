import { NextRequest, NextResponse } from 'next/server';
import { dbAll, updateStatusesAndOverdues } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await updateStatusesAndOverdues();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('q') || '';

    let query = `
      SELECT p.*, m.name as member_name, m.phone, m.plan_duration, m.photo as member_photo
      FROM payments p
      JOIN members m ON p.member_id = m.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status) {
      query += ' AND p.payment_status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND m.name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY p.due_date DESC';
    const payments = await dbAll(query, params);
    return NextResponse.json(payments);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
