const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');

function computeNextDueDate(recurring, from) {
  if (recurring.frequency === 'monthly' && recurring.dayOfMonth) {
    let next = new Date(from.getFullYear(), from.getMonth(), recurring.dayOfMonth);
    if (next < from) next = new Date(from.getFullYear(), from.getMonth() + 1, recurring.dayOfMonth);
    return next;
  }
  if (recurring.frequency === 'weekly' && recurring.dayOfWeek !== null) {
    const diff = (recurring.dayOfWeek - from.getDay() + 7) % 7;
    const next = new Date(from);
    next.setDate(from.getDate() + diff);
    return next;
  }
  return null;
}

function daysBetween(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const [accounts, goals, transactions, recurring, budgets] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.recurringTransaction.findMany({ where: { userId, active: true } }),
    prisma.budget.findMany({ where: { userId } }),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTransactions = transactions.filter((t) => new Date(t.date) >= startOfMonth);

  const monthIncome = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const netWorth = accounts.reduce((s, a) => s + a.balance, 0);

  const totalGoalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalGoalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const savingsProgressPct = totalGoalTarget > 0 ? Math.min(100, (totalGoalSaved / totalGoalTarget) * 100) : 0;

  const upcomingBills = recurring
    .filter((r) => r.type === 'expense')
    .map((r) => ({ ...r, nextDue: computeNextDueDate(r, now) }))
    .filter((r) => r.nextDue && daysBetween(now, r.nextDue) <= 14)
    .sort((a, b) => a.nextDue - b.nextDue)
    .slice(0, 6);

  const budgetStatus = budgets.map((b) => {
    const spent = monthTransactions
      .filter((t) => t.type === 'expense' && t.category === b.category)
      .reduce((s, t) => s + t.amount, 0);
    return {
      id: b.id,
      category: b.category,
      monthlyLimit: b.monthlyLimit,
      spent,
      remaining: b.monthlyLimit - spent,
      pct: Math.min(100, (spent / b.monthlyLimit) * 100),
      overBudget: spent > b.monthlyLimit,
    };
  });

  res.json({
    accounts,
    netWorth,
    monthIncome,
    monthExpense,
    savings: { totalSaved: totalGoalSaved, totalTarget: totalGoalTarget, progressPct: savingsProgressPct },
    upcomingBills,
    recentTransactions: transactions.slice(0, 8),
    budgetStatus,
  });
});

module.exports = { getDashboard };