import { NextRequest, NextResponse } from 'next/server';
import { updateStatusesAndOverdues } from '@/lib/db';
import { sql } from '@vercel/postgres';

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

type Params = { params: Promise<{ id: string }> };

// GET: Single member detail
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await updateStatusesAndOverdues();
    const { id: memberId } = await params;
    const memberResult = await sql`SELECT * FROM members WHERE id = ${memberId}`;

    if (memberResult.rowCount === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    const member = memberResult.rows[0];

    const payments = await sql`SELECT * FROM payments WHERE member_id = ${memberId} ORDER BY due_date DESC`;
    const renewals = await sql`SELECT * FROM renewals WHERE member_id = ${memberId} ORDER BY renewed_on DESC`;
    const attendance = await sql`SELECT * FROM attendance WHERE member_id = ${memberId} ORDER BY attendance_date DESC`;

    const totalDays = attendance.rows.length;
    const presentDays = attendance.rows.filter((a) => a.status === 'Present').length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    return NextResponse.json({ 
      member, 
      payments: payments.rows, 
      renewals: renewals.rows, 
      attendance: attendance.rows, 
      attendancePercentage 
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// PUT: Edit member
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await updateStatusesAndOverdues();
    const { id: memberId } = await params;
    const body = await request.json();

    const currentMemberResult = await sql`SELECT * FROM members WHERE id = ${memberId}`;
    if (currentMemberResult.rowCount === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    const currentMember = currentMemberResult.rows[0];

    const newName = body.name || currentMember.name;
    const newAge = body.age !== undefined ? body.age : currentMember.age;
    const newGender = body.gender !== undefined ? body.gender : currentMember.gender;
    const newPhone = body.phone !== undefined ? body.phone : currentMember.phone;
    const newAddress = body.address !== undefined ? body.address : currentMember.address;
    const newHeight = body.height !== undefined ? body.height : currentMember.height;
    const newWeight = body.weight !== undefined ? body.weight : currentMember.weight;
    const newJoinDate = body.join_date || currentMember.join_date;
    const newPlanType = body.plan_type !== undefined ? body.plan_type : currentMember.plan_type;
    const newPlanDuration = body.plan_duration || currentMember.plan_duration;
    const newPhoto = body.photo !== undefined ? body.photo : currentMember.photo;

    let newExpiryDate = body.expiry_date;
    if (!newExpiryDate && (body.join_date !== currentMember.join_date || body.plan_duration !== currentMember.plan_duration)) {
      newExpiryDate = calculateExpiryDate(newJoinDate as string, newPlanDuration as string);
    } else if (!newExpiryDate) {
      newExpiryDate = currentMember.expiry_date;
    }

    let newStatus = body.status;
    if (!newStatus) {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayParts = todayStr.split('-');
      const today = new Date(Date.UTC(parseInt(todayParts[0], 10), parseInt(todayParts[1], 10) - 1, parseInt(todayParts[2], 10)));
      const expiryParts = (newExpiryDate as string).split('-');
      const expiry = new Date(Date.UTC(parseInt(expiryParts[0], 10), parseInt(expiryParts[1], 10) - 1, parseInt(expiryParts[2], 10)));
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      newStatus = 'Active';
      if (diffDays < 0) newStatus = 'Expired';
      else if (diffDays <= 7) newStatus = 'Expiring Soon';
    }

    const cleanAge = newAge !== undefined && newAge !== '' ? Number(newAge) : null;
    const cleanHeight = newHeight !== undefined && newHeight !== '' ? Number(newHeight) : null;
    const cleanWeight = newWeight !== undefined && newWeight !== '' ? Number(newWeight) : null;

    await sql`
      UPDATE members SET 
        name=${newName}, age=${cleanAge}, gender=${newGender}, phone=${newPhone}, 
        address=${newAddress}, height=${cleanHeight}, weight=${cleanWeight}, 
        join_date=${newJoinDate}, plan_type=${newPlanType || 'Plan 1'}, 
        plan_duration=${newPlanDuration}, expiry_date=${newExpiryDate}, 
        status=${newStatus}, photo=${newPhoto} 
      WHERE id=${memberId}
    `;

    return NextResponse.json({ message: 'Member updated successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// DELETE: Delete member
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: memberId } = await params;
    const result = await sql`DELETE FROM members WHERE id = ${memberId}`;
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Member deleted successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
