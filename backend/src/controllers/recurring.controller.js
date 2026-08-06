const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const getRecurring = asyncHandler(async (req, res) => {
  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(recurring);
});

const createRecurring = asyncHandler(async (req, res) => {
  const { amount, type, category, frequency, dayOfMonth, dayOfWeek, goalId, accountId } = req.body;

  if (!amount || !type || !frequency) {
    throw new AppError('Amount, type, and frequency are required', 400);
  }
  if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    throw new AppError('Amount must be a positive number', 400);
  }
  if (type !== 'income' && type !== 'expense') {
    throw new AppError('Type must be either "income" or "expense"', 400);
  }
  if (type === 'expense' && !category) {
    throw new AppError('Category is required for expenses', 400);
  }
  if (!['weekly', 'monthly'].includes(frequency)) {
    throw new AppError('Frequency must be "weekly" or "monthly"', 400);
  }
  if (frequency === 'monthly' && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 28)) {
    throw new AppError('Day of month must be between 1 and 28', 400);
  }
  if (frequency === 'weekly' && (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6)) {
    throw new AppError('Day of week must be between 0 (Sunday) and 6 (Saturday)', 400);
  }

  let goal = null;
  if (goalId) {
    if (type !== 'income') throw new AppError('Only income can be allocated to a goal', 400);
    goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new AppError('Goal not found', 404);
    if (goal.userId !== req.userId) throw new AppError('This is not your goal', 403);
  }

  let account = null;
  if (accountId) {
    account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new AppError('Account not found', 404);
    if (account.userId !== req.userId) throw new AppError('This is not your account', 403);
  } else {
    account = await prisma.account.findFirst({ where: { userId: req.userId, type: 'cash' } });
  }

  const recurring = await prisma.recurringTransaction.create({
    data: {
      userId: req.userId,
      amount: parseFloat(amount),
      type,
      category: type === 'income' ? (category || null) : category,
      frequency,
      dayOfMonth: frequency === 'monthly' ? parseInt(dayOfMonth) : null,
      dayOfWeek: frequency === 'weekly' ? parseInt(dayOfWeek) : null,
      goalId: goal ? goal.id : null,
      accountId: account ? account.id : null,
    },
  });

  res.status(201).json(recurring);
});

const deactivateRecurring = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const recurring = await prisma.recurringTransaction.findUnique({ where: { id } });
  if (!recurring) throw new AppError('Recurring transaction not found', 404);
  if (recurring.userId !== req.userId) throw new AppError('This is not yours', 403);

  const updated = await prisma.recurringTransaction.update({
    where: { id },
    data: { active: false },
  });

  res.json(updated);
});

module.exports = { getRecurring, createRecurring, deactivateRecurring };