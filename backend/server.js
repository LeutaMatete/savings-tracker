require('dotenv').config();
const app = require('./src/app');
const { startRecurringTransactionsJob } = require('./src/jobs/recurringTransactions.job');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  startRecurringTransactionsJob();
});