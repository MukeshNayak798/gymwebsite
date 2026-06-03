import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun, updateStatusesAndOverdues } from '@/lib/db';

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

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await updateStatusesAndOverdues();
    const { id: memberId } = await params;
    const { plan_type, plan_duration, pay_now, renewed_on } = await request.json();

    if (!plan_duration || !renewed_on) {
      return NextResponse.json({ error: 'Plan duration and renewal date are required.' }, { status: 400 });
    }

    const member = await dbGet<Record<string, unknown>>('SELECT * FROM members WHERE id = ?', [memberId]);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const oldExpiryStr = member.expiry_date as string;

    let baseDate = oldExpiryStr;
    if (member.status === 'Expired' || new Date(oldExpiryStr) < new Date(renewed_on)) {
      baseDate = renewed_on;
    }

    const newExpiryStr = calculateExpiryDate(baseDate, plan_duration);

    const today = new Date();
    const expiry = new Date(newExpiryStr);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let newStatus = 'Active';
    if (diffDays < 0) newStatus = 'Expired';
    else if (diffDays <= 7) newStatus = 'Expiring Soon';

    const newPlanType = plan_type || (member.plan_type as string) || 'Plan 1';

    await dbRun(
      `UPDATE members SET plan_type=?, plan_duration=?, expiry_date=?, status=? WHERE id=?`,
      [newPlanType, plan_duration, newExpiryStr, newStatus, memberId]
    );

    await dbRun(
      `INSERT INTO renewals (member_id, old_expiry_date, new_expiry_date, renewed_on) VALUES (?, ?, ?, ?)`,
      [memberId, oldExpiryStr, newExpiryStr, renewed_on]
    );

    const amount = getPlanAmount(newPlanType, plan_duration);
    const paymentStatus = pay_now ? 'Paid' : 'Pending';
    const paymentDate = pay_now ? renewed_on : null;

    await dbRun(
      `INSERT INTO payments (member_id, amount, payment_date, due_date, payment_status) VALUES (?, ?, ?, ?, ?)`,
      [memberId, amount, paymentDate, renewed_on, paymentStatus]
    );

    return NextResponse.json({ message: 'Membership renewed successfully', new_expiry_date: newExpiryStr, status: newStatus });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
