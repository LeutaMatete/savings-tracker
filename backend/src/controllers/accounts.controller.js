const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const getAccounts = asyncHandler(async (req, res) => {
  const accounts = await prisma.account.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(accounts);
});

const createAccount = asyncHandler(async (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) {
    throw new AppError('Name and type are required', 400);
  }
  const account = await prisma.account.create({
    data: { userId: req.userId, name, type, balance: 0 },
  });
  res.status(201).json(account);
});

module.exports = { getAccounts, createAccount };