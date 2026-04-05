import { prisma } from './prisma';

export const LIMITS = {
  guest: 5,
  free: 20,
  pro: 200,
  unlimited: Infinity,
};

export async function checkRateLimit({ userId, guestId, plan }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (userId) {
    const count = await prisma.lookup.count({
      where: { userId, createdAt: { gte: today } },
    });
    const limit = LIMITS[plan] ?? LIMITS.free;
    return { allowed: count < limit, count, limit, plan };
  }

  // Guest
  if (guestId) {
    const guest = await prisma.guestUsage.upsert({
      where: { guestId },
      update: {},
      create: { guestId, count: 0 },
    });
    // Reset if a day old
    const isOld = (Date.now() - guest.updatedAt.getTime()) > 86400000;
    const count = isOld ? 0 : guest.count;
    return { allowed: count < LIMITS.guest, count, limit: LIMITS.guest, plan: 'guest' };
  }

  return { allowed: false, count: 0, limit: 0, plan: 'none' };
}

export async function recordLookup({ userId, guestId, type, query }) {
  if (userId) {
    await prisma.lookup.create({ data: { userId, type, query } });
  } else if (guestId) {
    await prisma.guestUsage.upsert({
      where: { guestId },
      update: { count: { increment: 1 } },
      create: { guestId, count: 1 },
    });
    await prisma.lookup.create({ data: { guestId, type, query } });
  }
}
