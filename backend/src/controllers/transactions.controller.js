const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const getTransactions = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = { userId: req.userId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
  });
  res.json(transactions);
});

async function resolveAccount(userId, accountId) {
  if (accountId) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new AppError('Account not found', 404);
    if (account.userId !== userId) throw new AppError('This is not your account', 403);
    return account;
  }
  return prisma.account.findFirst({ where: { userId, type: 'cash' } });
}

const createTransaction = asyncHandler(async (req, res) => {
  const { amount, type, category, date, goalId, accountId } = req.body;

  if (!amount || !type) {
    throw new AppError('Amount and type are required', 400);
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

  const parsedAmount = parseFloat(amount);
  const account = await resolveAccount(req.userId, accountId);

  let goal = null;
  if (goalId) {
    if (type !== 'income') {
      throw new AppError('Only income can be allocated to a goal', 400);
    }
    goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new AppError('Goal not found', 404);
    if (goal.userId !== req.userId) throw new AppError('This is not your goal', 403);
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const newTransaction = await tx.transaction.create({
      data: {
        userId: req.userId,
        amount: parsedAmount,
        type,
        category: type === 'income' ? (category || null) : category,
        date: date ? new Date(date) : new Date(),
        accountId: account ? account.id : null,
      },
    });

    if (account) {
      const delta = type === 'income' ? parsedAmount : -parsedAmount;
      await tx.account.update({ where: { id: account.id }, data: { balance: account.balance + delta } });
    }

    if (goal) {
      await tx.goal.update({
        where: { id: goal.id },
        data: { currentAmount: goal.currentAmount + parsedAmount },
      });
    }

    return newTransaction;
  });

  res.status(201).json(transaction);
});

const updateTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, category, date } = req.body;

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) throw new AppError('Transaction not found', 404);
  if (transaction.userId !== req.userId) throw new AppError('You cannot edit a transaction that is not yours', 403);
  if (amount !== undefined && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
    throw new AppError('Amount must be a positive number', 400);
  }
  if (transaction.type === 'expense' && category === '') {
    throw new AppError('Category is required for expenses', 400);
  }

  const newAmount = amount !== undefined ? parseFloat(amount) : transaction.amount;

  const updated = await prisma.$transaction(async (tx) => {
    if (transaction.accountId && amount !== undefined && newAmount !== transaction.amount) {
      const account = await tx.account.findUnique({ where: { id: transaction.accountId } });
      if (account) {
        const oldDelta = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        const newDelta = transaction.type === 'income' ? newAmount : -newAmount;
        await tx.account.update({
          where: { id: account.id },
          data: { balance: account.balance + (newDelta - oldDelta) },
        });
      }
    }

    return tx.transaction.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: newAmount }),
        ...(category !== undefined && { category }),
        ...(date !== undefined && { date: new Date(date) }),
      },
    });
  });

  res.json(updated);
});

const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) throw new AppError('Transaction not found', 404);
  if (transaction.userId !== req.userId) throw new AppError('You cannot delete a transaction that is not yours', 403);

  await prisma.$transaction(async (tx) => {
    if (transaction.accountId) {
      const account = await tx.account.findUnique({ where: { id: transaction.accountId } });
      if (account) {
        const reverseDelta = transaction.type === 'income' ? -transaction.amount : transaction.amount;
        await tx.account.update({ where: { id: account.id }, data: { balance: account.balance + reverseDelta } });
      }
    }
    await tx.transaction.delete({ where: { id } });
  });

  res.json({ message: 'Transaction deleted' });
});

module.exports = { getTransactions, createTransaction, updateTransaction, deleteTransaction };