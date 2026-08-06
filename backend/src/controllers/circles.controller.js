const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const createCircle = asyncHandler(async (req, res) => {
  const { name, contributionAmount, frequency, payoutType, targetAmount } = req.body;

  if (!name || !contributionAmount || !frequency || !payoutType) {
    throw new AppError('Name, contributionAmount, frequency, and payoutType are required', 400);
  }
  if (isNaN(parseFloat(contributionAmount)) || parseFloat(contributionAmount) <= 0) {
    throw new AppError('Contribution amount must be a positive number', 400);
  }
  if (!['weekly', 'monthly'].includes(frequency)) {
    throw new AppError('Frequency must be "weekly" or "monthly"', 400);
  }
  if (!['rotating', 'pooled'].includes(payoutType)) {
    throw new AppError('Payout type must be "rotating" or "pooled"', 400);
  }
  if (payoutType === 'pooled' && (!targetAmount || parseFloat(targetAmount) <= 0)) {
    throw new AppError('Pooled circles need a positive target amount', 400);
  }

  const circle = await prisma.circle.create({
    data: {
      name,
      contributionAmount: parseFloat(contributionAmount),
      frequency,
      payoutType,
      targetAmount: payoutType === 'pooled' ? parseFloat(targetAmount) : null,
      members: { create: { userId: req.userId } },
    },
    include: { members: true },
  });

  res.status(201).json(circle);
});

const getAllCircles = asyncHandler(async (req, res) => {
  const circles = await prisma.circle.findMany({
    include: { members: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(circles);
});

const getMyCircles = asyncHandler(async (req, res) => {
  const circles = await prisma.circle.findMany({
    where: { members: { some: { userId: req.userId } } },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true } },
          contributions: true,
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
  res.json(circles);
});

const joinCircle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const circle = await prisma.circle.findUnique({ where: { id } });
  if (!circle) {
    throw new AppError('Circle not found', 404);
  }

  const existingMembership = await prisma.circleMember.findFirst({
    where: { circleId: id, userId: req.userId },
  });
  if (existingMembership) {
    throw new AppError('You are already a member of this circle', 409);
  }

  const membership = await prisma.circleMember.create({
    data: { circleId: id, userId: req.userId },
  });

  res.status(201).json(membership);
});

const contribute = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    throw new AppError('A positive amount is required', 400);
  }

  const membership = await prisma.circleMember.findFirst({
    where: { circleId: id, userId: req.userId },
  });

  if (!membership) {
    throw new AppError('You must be a member of this circle to contribute', 403);
  }

  const contribution = await prisma.contribution.create({
    data: {
      memberId: membership.id,
      amount: parseFloat(amount),
      status: 'paid',
      datePaid: new Date(),
    },
  });

  res.status(201).json(contribution);
});

const triggerPayout = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const circle = await prisma.circle.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });

  if (!circle) throw new AppError('Circle not found', 404);
  if (circle.payoutType !== 'rotating') {
    throw new AppError('Payout can only be triggered for rotating circles', 400);
  }

  const requestingMembership = circle.members.find(m => m.userId === req.userId);
  if (!requestingMembership) {
    throw new AppError('You must be a member of this circle to do this', 403);
  }

  let recipient = circle.members.find(m => !m.hasReceivedPayout);

  if (!recipient) {
    await prisma.circleMember.updateMany({
      where: { circleId: id },
      data: { hasReceivedPayout: false },
    });
    recipient = circle.members[0];
    await prisma.circle.update({ where: { id }, data: { currentRound: circle.currentRound + 1 } });
  }

  await prisma.circleMember.update({
    where: { id: recipient.id },
    data: { hasReceivedPayout: true },
  });

  res.json({ message: `Payout marked as given to ${recipient.user.name}`, recipient: recipient.user.name });
});

module.exports = { createCircle, getAllCircles, getMyCircles, joinCircle, contribute, triggerPayout };