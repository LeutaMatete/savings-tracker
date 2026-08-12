const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const webpush = require('web-push');
const { computeBriefing } = require('../utils/briefing');

const subscribe = asyncHandler(async (req, res) => {
  const { subscription, timezoneOffsetMinutes } = req.body;
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throw new AppError('A valid push subscription is required', 400);
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { userId: req.userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      userId: req.userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  if (timezoneOffsetMinutes !== undefined) {
    await prisma.user.update({ where: { id: req.userId }, data: { timezoneOffsetMinutes } });
  }

  res.status(201).json({ message: 'Subscribed to push notifications' });
});

const updateSettings = asyncHandler(async (req, res) => {
  const { briefingEnabled, briefingHour, briefingMinute, timezoneOffsetMinutes } = req.body;

  if (briefingHour !== undefined && (briefingHour < 0 || briefingHour > 23)) {
    throw new AppError('Hour must be between 0 and 23', 400);
  }
  if (briefingMinute !== undefined && (briefingMinute < 0 || briefingMinute > 59)) {
    throw new AppError('Minute must be between 0 and 59', 400);
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      ...(briefingEnabled !== undefined && { briefingEnabled }),
      ...(briefingHour !== undefined && { briefingHour }),
      ...(briefingMinute !== undefined && { briefingMinute }),
      ...(timezoneOffsetMinutes !== undefined && { timezoneOffsetMinutes }),
    },
  });

  res.json({ briefingEnabled: user.briefingEnabled, briefingHour: user.briefingHour, briefingMinute: user.briefingMinute });
});

const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.userId } });
  }
  await prisma.user.update({ where: { id: req.userId }, data: { briefingEnabled: false } });
  res.json({ message: 'Unsubscribed' });
});

const getSettings = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  res.json({ briefingEnabled: user.briefingEnabled, briefingHour: user.briefingHour, briefingMinute: user.briefingMinute });
});

const getTodayBriefing = asyncHandler(async (req, res) => {
  const briefing = await computeBriefing(req.userId);
  res.json(briefing);
});

const sendTestBriefing = asyncHandler(async (req, res) => {
  const subs = await prisma.pushSubscription.findMany({ where: { userId: req.userId } });
  if (subs.length === 0) {
    throw new AppError('No push subscription found — enable notifications first', 400);
  }
  const briefing = await computeBriefing(req.userId);

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: 'Your morning briefing', body: briefing.text })
      )
    )
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length === subs.length) {
    throw new AppError('Failed to send notification — try re-enabling notifications', 500);
  }

  res.json({ message: 'Test briefing sent', briefing: briefing.text });
});

module.exports = { subscribe, updateSettings, unsubscribe, getSettings, getTodayBriefing, sendTestBriefing };