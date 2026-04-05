import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return NextResponse.json({ error: `Webhook error: ${e.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, plan } = session.metadata;
    await prisma.user.update({
      where: { id: userId },
      data: { plan, stripeSubscriptionId: session.subscription },
    });
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    await prisma.user.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: { plan: 'free', stripeSubscriptionId: null },
    });
  }

  return NextResponse.json({ received: true });
}
