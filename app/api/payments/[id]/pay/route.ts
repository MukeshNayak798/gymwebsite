import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function PUT(_req: NextRequest, { params }: Params) {
  try {
    const { id: paymentId } = await params;
    const todayStr = new Date().toISOString().split('T')[0];

    const payment = await dbGet('SELECT * FROM payments WHERE id = ?', [paymentId]);
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    }

    await dbRun(`UPDATE payments SET payment_status = 'Paid', payment_date = ? WHERE id = ?`, [todayStr, paymentId]);

    return NextResponse.json({ message: 'Payment recorded successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
