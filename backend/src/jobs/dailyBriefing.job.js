const cron = require('node-cron');
const prisma = require('../lib/prisma');
const webpush = require('web-push');
const { computeBriefing } = require('../utils/briefing');

async function runDailyBriefings() {
  const now = new Date();
  const nowUTCMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const users = await prisma.user.findMany({
    where: { briefingEnabled: true, briefingHour: { not: null } },
    include: { pushSubscriptions: true },
  });

  for (const user of users) {
    if (user.pushSubscriptions.length === 0) continue;

    const offset = user.timezoneOffsetMinutes || 0;
    const targetUTCMinutes = ((user.briefingHour * 60 + (user.briefingMinute || 0)) + offset + 1440) % 1440;
    const diff = Math.abs(targetUTCMinutes - nowUTCMinutes);
    if (diff > 1 && diff < 1439) continue;

    try {
      const briefing = await computeBriefing(user.id);
      await Promise.allSettled(
        user.pushSubscriptions.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: 'Your morning briefing', body: briefing.text })
          )
        )
      );
      console.log(`✅ Sent briefing to ${user.email}`);
    } catch (error) {
      console.error(`Failed to send briefing to ${user.email}:`, error);
    }
  }
}

function startDailyBriefingJob() {
  cron.schedule('* * * * *', runDailyBriefings);
  console.log('☀️  Daily briefing job scheduled');
}

module.exports = { startDailyBriefingJob, runDailyBriefings };