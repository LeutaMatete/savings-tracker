const cron = require('node-cron');
const prisma = require('../lib/prisma');
const webpush = require('web-push');
const { computeVelocityWarnings } = require('../utils/velocity');

async function runVelocityAlerts() {
  const users = await prisma.user.findMany({
    where: { velocityAlertsEnabled: true },
    include: { pushSubscriptions: true },
  });

  const today = new Date();
  const todayKey = today.toDateString();

  for (const user of users) {
    if (user.pushSubscriptions.length === 0) continue;

    try {
      const warnings = await computeVelocityWarnings(user.id);

      for (const warning of warnings) {
        const budget = await prisma.budget.findUnique({ where: { id: warning.budgetId } });
        if (budget.lastVelocityWarnedAt && new Date(budget.lastVelocityWarnedAt).toDateString() === todayKey) {
          continue; // already warned about this one today
        }

        await Promise.allSettled(
          user.pushSubscriptions.map((sub) =>
            webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({ title: 'Spending pace alert', body: warning.message })
            )
          )
        );

        await prisma.budget.update({ where: { id: warning.budgetId }, data: { lastVelocityWarnedAt: today } });
        console.log(`⚠️  Sent velocity warning to ${user.email} for "${warning.category}"`);
      }
    } catch (error) {
      console.error(`Failed velocity check for ${user.email}:`, error);
    }
  }
}

function startVelocityAlertsJob() {
  cron.schedule('30 12 * * *', runVelocityAlerts); // once daily at 12:30 UTC
  console.log('📉 Velocity alerts job scheduled');
}

module.exports = { startVelocityAlertsJob, runVelocityAlerts };