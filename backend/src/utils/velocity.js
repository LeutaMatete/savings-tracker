const prisma = require('../lib/prisma');

const WARN_THRESHOLD_PCT = 20; // only warn if pace is at least this much faster than baseline

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

async function getHistoricalDailyRate(userId, category, now) {
  // look at the previous 3 full calendar months for this category
  const months = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  const rates = [];
  for (const { year, month } of months) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    const txs = await prisma.transaction.findMany({
      where: { userId, type: 'expense', category, date: { gte: start, lt: end } },
    });
    if (txs.length === 0) continue;
    const total = txs.reduce((s, t) => s + t.amount, 0);
    rates.push(total / daysInMonth(year, month));
  }

  if (rates.length === 0) return null;
  return rates.reduce((s, r) => s + r, 0) / rates.length;
}

async function computeVelocityWarnings(userId) {
  const budgets = await prisma.budget.findMany({ where: { userId } });
  if (budgets.length === 0) return [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysElapsed = Math.max(1, now.getDate());
  const totalDaysInMonth = daysInMonth(now.getFullYear(), now.getMonth());

  const warnings = [];

  for (const budget of budgets) {
    const monthTx = await prisma.transaction.findMany({
      where: { userId, type: 'expense', category: budget.category, date: { gte: startOfMonth } },
    });
    const spentThisMonth = monthTx.reduce((s, t) => s + t.amount, 0);
    const currentDailyRate = spentThisMonth / daysElapsed;

    if (currentDailyRate <= 0) continue;

    let baselineDailyRate = await getHistoricalDailyRate(userId, budget.category, now);
    let baselineSource = 'history';
    if (baselineDailyRate === null || baselineDailyRate === 0) {
      baselineDailyRate = budget.monthlyLimit / totalDaysInMonth;
      baselineSource = 'budget';
    }

    const percentFaster = ((currentDailyRate - baselineDailyRate) / baselineDailyRate) * 100;
    if (percentFaster < WARN_THRESHOLD_PCT) continue;

    const remaining = budget.monthlyLimit - spentThisMonth;
    if (remaining <= 0) continue; // already over budget — that's a different kind of alert, not "will run out"

    const daysLeftAtPace = remaining / currentDailyRate;
    const exhaustionDate = new Date(now);
    exhaustionDate.setDate(exhaustionDate.getDate() + Math.floor(daysLeftAtPace));

    if (exhaustionDate.getMonth() !== now.getMonth()) continue; // won't actually run out before month ends

    warnings.push({
      budgetId: budget.id,
      category: budget.category,
      percentFaster: Math.round(percentFaster),
      exhaustionDate,
      baselineSource,
      spentThisMonth,
      monthlyLimit: budget.monthlyLimit,
      message: `You're burning through your "${budget.category}" envelope ${Math.round(percentFaster)}% faster than usual. At this pace, you'll empty it by the ${ordinal(exhaustionDate.getDate())}. Want to slow down?`,
    });
  }

  return warnings;
}

module.exports = { computeVelocityWarnings };