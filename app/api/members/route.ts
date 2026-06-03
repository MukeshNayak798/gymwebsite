import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbAll, dbRun, updateStatusesAndOverdues } from '@/lib/db';

export const dynamic = 'force-dynamic';

function calculateExpiryDate(joinDateStr: string, planDuration: string): string {
  const parts = joinDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const date = new Date(Date.UTC(year, month, day));
  let months = 1;
  if (planDuration === '3 Months') months = 3;
  else if (planDuration === '6 Months') months = 6;
  else if (planDuration === '12 Months') months = 12;

  date.setUTCMonth(date.getUTCMonth() + months);

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getPlanAmount(planType: string, planDuration: string): number {
  if (planType === 'Plan 2') {
    switch (planDuration) {
      case '1 Month': return 1499;
      case '3 Months': return 3000;
      case '6 Months': return 5999;
      case '12 Months': return 7999;
      default: return 1499;
    }
  } else {
    switch (planDuration) {
      case '1 Month': return 1999;
      case '3 Months': return 4500;
      case '6 Months': return 6999;
      case '12 Months': return 9999;
      default: return 1999;
    }
  }
}

// GET: Members list with search, status filters, and pagination
export async function GET(request: NextRequest) {
  try {
    await updateStatusesAndOverdues();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM members WHERE 1=1';
    const params: unknown[] = [];

    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await dbGet<{ count: number }>(countQuery, params);

    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const members = await dbAll(query, params);

    return NextResponse.json({
      members,
      pagination: {
        total: countResult?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((countResult?.count || 0) / limit),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST: Add new member
export async function POST(request: NextRequest) {
  try {
    await updateStatusesAndOverdues();
    const { name, age, gender, phone, address, height, weight, join_date, plan_type, plan_duration, pay_now, photo } =
      await request.json();

    if (!name || !join_date || !plan_duration) {
      return NextResponse.json({ error: 'Name, join date, and plan duration are required.' }, { status: 400 });
    }

    const expiry_date = calculateExpiryDate(join_date, plan_duration);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayParts = todayStr.split('-');
    const today = new Date(
      Date.UTC(parseInt(todayParts[0], 10), parseInt(todayParts[1], 10) - 1, parseInt(todayParts[2], 10))
    );
    const expiryParts = expiry_date.split('-');
    const expiry = new Date(
      Date.UTC(parseInt(expiryParts[0], 10), parseInt(expiryParts[1], 10) - 1, parseInt(expiryParts[2], 10))
    );
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let memberStatus = 'Active';
    if (diffDays < 0) memberStatus = 'Expired';
    else if (diffDays <= 7) memberStatus = 'Expiring Soon';

    const cleanAge = age !== undefined && age !== '' ? Number(age) : null;
    const cleanHeight = height !== undefined && height !== '' ? Number(height) : null;
    const cleanWeight = weight !== undefined && weight !== '' ? Number(weight) : null;
    const cleanPlanType = plan_type || 'Plan 1';

    const result = await dbRun(
      `INSERT INTO members (name, age, gender, phone, address, height, weight, join_date, plan_type, plan_duration, expiry_date, status, photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, cleanAge, gender || 'Male', phone || '', address || '', cleanHeight, cleanWeight, join_date, cleanPlanType, plan_duration, expiry_date, memberStatus, photo || null]
    );

    const memberId = result.lastID;
    const amount = getPlanAmount(cleanPlanType, plan_duration);
    const paymentStatus = pay_now ? 'Paid' : 'Pending';
    const paymentDate = pay_now ? join_date : null;

    await dbRun(
      `INSERT INTO payments (member_id, amount, payment_date, due_date, payment_status) VALUES (?, ?, ?, ?, ?)`,
      [memberId, amount, paymentDate, join_date, paymentStatus]
    );

    return NextResponse.json({ id: memberId, name, expiry_date, status: memberStatus }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
