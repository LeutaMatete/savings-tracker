const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const getBudgets = asyncHandler(async (req, res) => {
  const budgets = await prisma.budget.findMany({ where: { userId: req.userId } });
  res.json(budgets);
});

const createBudget = asyncHandler(async (req, res) => {
  const { category, monthlyLimit } = req.body;
  if (!category || !monthlyLimit) {
    throw new AppError('Category and monthly limit are required', 400);
  }
  if (isNaN(parseFloat(monthlyLimit)) || parseFloat(monthlyLimit) <= 0) {
    throw new AppError('Monthly limit must be a positive number', 400);
  }

  const existing = await prisma.budget.findFirst({ where: { userId: req.userId, category } });
  if (existing) {
    throw new AppError('A budget for this category already exists', 409);
  }

  const budget = await prisma.budget.create({
    data: { userId: req.userId, category, monthlyLimit: parseFloat(monthlyLimit) },
  });
  res.status(201).json(budget);
});

const deleteBudget = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const budget = await prisma.budget.findUnique({ where: { id } });
  if (!budget) throw new AppError('Budget not found', 404);
  if (budget.userId !== req.userId) throw new AppError('This is not your budget', 403);

  await prisma.budget.delete({ where: { id } });
  res.json({ message: 'Budget deleted' });
});

module.exports = { getBudgets, createBudget, deleteBudget };