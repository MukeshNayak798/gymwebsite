import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbAll, dbRun, updateStatusesAndOverdues } from '@/lib/db';

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
    const member = await dbGet('SELECT * FROM members WHERE id = ?', [memberId]);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const payments = await dbAll('SELECT * FROM payments WHERE member_id = ? ORDER BY due_date DESC', [memberId]);
    const renewals = await dbAll('SELECT * FROM renewals WHERE member_id = ? ORDER BY renewed_on DESC', [memberId]);
    const attendance = await dbAll('SELECT * FROM attendance WHERE member_id = ? ORDER BY attendance_date DESC', [memberId]);

    const totalDays = attendance.length;
    const presentDays = (attendance as { status: string }[]).filter((a) => a.status === 'Present').length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    return NextResponse.json({ member, payments, renewals, attendance, attendancePercentage });
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

    const currentMember = await dbGet<Record<string, unknown>>('SELECT * FROM members WHERE id = ?', [memberId]);
    if (!currentMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

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

    await dbRun(
      `UPDATE members SET name=?, age=?, gender=?, phone=?, address=?, height=?, weight=?, join_date=?, plan_type=?, plan_duration=?, expiry_date=?, status=?, photo=? WHERE id=?`,
      [newName, cleanAge, newGender, newPhone, newAddress, cleanHeight, cleanWeight, newJoinDate, newPlanType || 'Plan 1', newPlanDuration, newExpiryDate, newStatus, newPhoto, memberId]
    );

    return NextResponse.json({ message: 'Member updated successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// DELETE: Delete member
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: memberId } = await params;
    const result = await dbRun('DELETE FROM members WHERE id = ?', [memberId]);
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Member deleted successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
