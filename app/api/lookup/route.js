import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, recordLookup } from '@/lib/rateLimit';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const { type, query, guestId } = body;

  const userId = session?.user?.id || null;
  const plan = session?.user?.plan || 'free';

  const { allowed, count, limit } = await checkRateLimit({ userId, guestId: userId ? null : guestId, plan });

  if (!allowed) {
    return NextResponse.json({
      error: 'RATE_LIMIT',
      count,
      limit,
      plan: userId ? plan : 'guest',
      message: userId
        ? `You've used all ${limit} lookups for today. Upgrade for more.`
        : `You've used all ${limit} free lookups. Sign up for 20/day free.`,
    }, { status: 429 });
  }

  await recordLookup({ userId, guestId: userId ? null : guestId, type, query });
  return NextResponse.json({ allowed: true, count: count + 1, limit });
}
