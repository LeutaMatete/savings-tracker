const prisma = require('../lib/prisma');

function isDueToday(recurring, today) {
  if (recurring.frequency === 'monthly') return today.getDate() === recurring.dayOfMonth;
  if (recurring.frequency === 'weekly') return today.getDay() === recurring.dayOfWeek;
  return false;
}

async function computeBriefing(userId) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOf30DaysAgo = new Date(startOfToday);
  startOf30DaysAgo.setDate(startOf30DaysAgo.getDate() - 30);

  const [yesterdayTx, last30Tx, goals, recurring, user] = await Promise.all([
    prisma.transaction.findMany({ where: { userId, type: 'expense', date: { gte: startOfYesterday, lt: startOfToday } } }),
    prisma.transaction.findMany({ where: { userId, type: 'expense', date: { gte: startOf30DaysAgo, lt: startOfToday } } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.recurringTransaction.findMany({ where: { userId, active: true, type: 'expense' } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  const yesterdaySpend = yesterdayTx.reduce((s, t) => s + t.amount, 0);
  const totalLast30 = last30Tx.reduce((s, t) => s + t.amount, 0);
  const avgDaily = totalLast30 / 30;

  let spendLine;
  if (avgDaily === 0) {
    spendLine = yesterdaySpend > 0
      ? `Yesterday you spent M${yesterdaySpend.toFixed(0)}.`
      : `You didn't log any spending yesterday.`;
  } else {
    const diffPct = Math.round(((avgDaily - yesterdaySpend) / avgDaily) * 100);
    if (diffPct > 0) spendLine = `Yesterday you spent M${yesterdaySpend.toFixed(0)} (${diffPct}% below your average).`;
    else if (diffPct < 0) spendLine = `Yesterday you spent M${yesterdaySpend.toFixed(0)} (${Math.abs(diffPct)}% above your average).`;
    else spendLine = `Yesterday you spent M${yesterdaySpend.toFixed(0)}, right at your average.`;
  }

  const incompleteGoals = goals.filter((g) => g.currentAmount < g.targetAmount);
  let goalLine = null;
  if (incompleteGoals.length > 0) {
    const withDeadline = incompleteGoals.filter((g) => g.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const target = withDeadline[0] || [...incompleteGoals].sort((a, b) => (b.currentAmount / b.targetAmount) - (a.currentAmount / a.targetAmount))[0];
    const pct = Math.round((target.currentAmount / target.targetAmount) * 100);
    goalLine = `Your "${target.title}" goal is ${pct}% funded.`;
  }

  const dueToday = recurring.filter((r) => isDueToday(r, now));
  let billsLine;
  if (dueToday.length === 0) billsLine = 'No bills due today.';
  else if (dueToday.length === 1) billsLine = `${dueToday[0].category || 'A bill'} (M${dueToday[0].amount.toFixed(0)}) is due today.`;
  else billsLine = `${dueToday.length} bills due today, totalling M${dueToday.reduce((s, r) => s + r.amount, 0).toFixed(0)}.`;

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const name = user?.name ? user.name.split(' ')[0] : '';

  const text = [
    `${greeting}${name ? ', ' + name : ''}.`,
    [spendLine, goalLine].filter(Boolean).join(' '),
    `${billsLine} Have a good one.`,
  ].join(' ');

  return { text };
}

module.exports = { computeBriefing };