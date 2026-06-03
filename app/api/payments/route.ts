import { NextRequest, NextResponse } from 'next/server';
import { updateStatusesAndOverdues } from '@/lib/db';
import { sql } from '@vercel/postgres';

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
    let params: unknown[] = [];

    if (status) {
      query += ` AND p.payment_status = $${params.length + 1}`;
      params.push(status);
    }
    if (search) {
      query += ` AND m.name ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY p.due_date DESC';
    const payments = await sql.query(query, params);
    return NextResponse.json(payments.rows);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
