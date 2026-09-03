const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const getGoals = asyncHandler(async (req, res) => {
  const goals = await prisma.goal.findMany({
    where: { userId: req.userId },
    orderBy: { deadline: 'asc' },
  });
  res.json(goals);
});

const createGoal = asyncHandler(async (req, res) => {
  const { title, targetAmount, deadline } = req.body;

  if (!title || !targetAmount) {
    throw new AppError('Title and target amount are required', 400);
  }
  if (isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0) {
    throw new AppError('Target amount must be a positive number', 400);
  }
  if (deadline && new Date(deadline) <= new Date()) {
    throw new AppError('Deadline must be in the future', 400);
  }

  const goal = await prisma.goal.create({
    data: {
      userId: req.userId,
      title,
      targetAmount: parseFloat(targetAmount),
      deadline: deadline ? new Date(deadline) : null,
    },
  });

  res.status(201).json(goal);
});

const updateGoal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, targetAmount, deadline } = req.body;

  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) {
    throw new AppError('Goal not found', 404);
  }
  if (goal.userId !== req.userId) {
    throw new AppError('This is not your goal', 403);
  }
  if (targetAmount !== undefined && (isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0)) {
    throw new AppError('Target amount must be a positive number', 400);
  }
  if (deadline && new Date(deadline) <= new Date()) {
    throw new AppError('Deadline must be in the future', 400);
  }

  const updated = await prisma.goal.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(targetAmount !== undefined && { targetAmount: parseFloat(targetAmount) }),
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
    },
  });

  res.json(updated);
});

async function getAvailableBalance(userId) {
  const transactions = await prisma.transaction.findMany({ where: { userId } });
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const goals = await prisma.goal.findMany({ where: { userId } });
  const totalAllocated = goals.reduce((s, g) => s + g.currentAmount, 0);

  return balance - totalAllocated;
}

const getBalanceSummary = asyncHandler(async (req, res) => {
  const available = await getAvailableBalance(req.userId);
  res.json({ availableBalance: available });
});

function computeMonthlyRequired(goal, now = new Date()) {
  if (!goal.deadline) return null;

  const deadline = new Date(goal.deadline);
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44;
  const monthsLeft = (deadline - now) / msPerMonth;

  if (monthsLeft <= 0) {
    return { remaining, monthsLeft: 0, monthlyRequired: remaining, overdue: true };
  }

  const monthlyRequired = remaining / monthsLeft;
  return { remaining, monthsLeft, monthlyRequired, overdue: false };
}

const getMonthlyPlans = asyncHandler(async (req, res) => {
  const goals = await prisma.goal.findMany({ where: { userId: req.userId, deadline: { not: null } } });
  const available = await getAvailableBalance(req.userId);

  const totalIncome = (await prisma.transaction.findMany({
    where: { userId: req.userId, type: 'income', date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
  })).reduce((s, t) => s + t.amount, 0);

  const plans = goals.map((goal) => {
    const plan = computeMonthlyRequired(goal);
    if (!plan) return null;

    const pctOfIncome = totalIncome > 0 ? (plan.monthlyRequired / totalIncome) * 100 : null;

    return {
      goalId: goal.id,
      title: goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      deadline: goal.deadline,
      remaining: plan.remaining,
      monthsLeft: Math.round(plan.monthsLeft * 10) / 10,
      monthlyRequired: Math.round(plan.monthlyRequired * 100) / 100,
      overdue: plan.overdue,
      pctOfMonthlyIncome: pctOfIncome !== null ? Math.round(pctOfIncome) : null,
      feasible: pctOfIncome === null ? null : pctOfIncome <= 60,
    };
  }).filter(Boolean);

  res.json({ plans, availableBalance: available, last30DayIncome: totalIncome });
});

const contributeToGoal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    throw new AppError('A positive amount is required', 400);
  }
  const parsedAmount = parseFloat(amount);

  const goal = await prisma.goal.findUnique({ where: { id } });

  if (!goal) {
    throw new AppError('Goal not found', 404);
  }
  if (goal.userId !== req.userId) {
    throw new AppError('This is not your goal', 403);
  }

  const available = await getAvailableBalance(req.userId);

  if (parsedAmount > available) {
    throw new AppError(
      `You only have M${available.toFixed(2)} available — that's more than your current balance allows`,
      400
    );
  }

  const updatedGoal = await prisma.goal.update({
    where: { id },
    data: { currentAmount: goal.currentAmount + parsedAmount },
  });

  res.json(updatedGoal);
});

const deleteGoal = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const goal = await prisma.goal.findUnique({ where: { id } });

  if (!goal) {
    throw new AppError('Goal not found', 404);
  }
  if (goal.userId !== req.userId) {
    throw new AppError('This is not your goal', 403);
  }

  await prisma.goal.delete({ where: { id } });
  res.json({ message: 'Goal deleted' });
});

module.exports = {
  getGoals, createGoal, updateGoal, getAvailableBalance,
  getBalanceSummary, getMonthlyPlans, contributeToGoal, deleteGoal,
};