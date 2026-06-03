import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

type Params = { params: Promise<{ id: string }> };

export async function PUT(_req: NextRequest, { params }: Params) {
  try {
    const { id: paymentId } = await params;
    const todayStr = new Date().toISOString().split('T')[0];

    const paymentResult = await sql`SELECT * FROM payments WHERE id = ${paymentId}`;
    if (paymentResult.rowCount === 0) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    }

    await sql`UPDATE payments SET payment_status = 'Paid', payment_date = ${todayStr} WHERE id = ${paymentId}`;

    return NextResponse.json({ message: 'Payment recorded successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
