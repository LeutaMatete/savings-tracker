require('dotenv').config();
const app = require('./src/app');
const webpush = require('web-push');
const { startRecurringTransactionsJob } = require('./src/jobs/recurringTransactions.job');
const { startDailyBriefingJob } = require('./src/jobs/dailyBriefing.job');
const { startVelocityAlertsJob } = require('./src/jobs/velocityAlerts.job');

const PORT = process.env.PORT || 5000;

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  startRecurringTransactionsJob();
  startDailyBriefingJob();
  startVelocityAlertsJob();
});