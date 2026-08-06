const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { parseCommand } = require('../utils/quickCaptureParser');
const { getAvailableBalance } = require('./goals.controller');

function fuzzyFind(items, query, nameSelector) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedQuery = normalize(query);

  const exact = items.find((i) => normalize(nameSelector(i)) === normalizedQuery);
  if (exact) return { match: exact, ambiguous: null };

  const candidates = items.filter((i) => {
    const n = normalize(nameSelector(i));
    return n.includes(normalizedQuery) || normalizedQuery.includes(n);
  });

  if (candidates.length === 1) return { match: candidates[0], ambiguous: null };
  if (candidates.length > 1) return { match: null, ambiguous: candidates.map(nameSelector) };
  return { match: null, ambiguous: null };
}

function notFoundMessage(result, query, allNames, kind) {
  if (result.ambiguous) {
    return `That matches several ${kind}s: ${result.ambiguous.join(', ')} — be more specific`;
  }
  return `Couldn't find a ${kind} matching "${query}". Your ${kind}s: ${allNames.join(', ') || 'none yet'}`;
}

const runCommand = asyncHandler(async (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== 'string') {
    throw new AppError('Send a command string, e.g. "-50 lunch"', 400);
  }

  const intent = parseCommand(command);
  const cashAccount = await prisma.account.findFirst({ where: { userId: req.userId, type: 'cash' } });

  if (intent.type === 'balance') {
    const available = await getAvailableBalance(req.userId);
    return res.json({
      type: 'balance',
      message: `Available balance: M${available.toFixed(2)}`,
      data: { availableBalance: available },
    });
  }

  if (intent.type === 'expense') {
    const transaction = await prisma.$transaction(async (tx) => {
      const newTx = await tx.transaction.create({
        data: {
          userId: req.userId,
          amount: intent.amount,
          type: 'expense',
          category: intent.category,
          date: new Date(),
          accountId: cashAccount ? cashAccount.id : null,
        },
      });
      if (cashAccount) {
        await tx.account.update({ where: { id: cashAccount.id }, data: { balance: cashAccount.balance - intent.amount } });
      }
      return newTx;
    });
    return res.status(201).json({
      type: 'expense',
      message: `Logged M${intent.amount.toFixed(2)} expense under "${intent.category}"`,
      data: transaction,
    });
  }

  if (intent.type === 'income') {
    let goal = null;

    if (intent.goalQuery) {
      const goals = await prisma.goal.findMany({ where: { userId: req.userId } });
      const result = fuzzyFind(goals, intent.goalQuery, (g) => g.title);
      if (!result.match) {
        throw new AppError(notFoundMessage(result, intent.goalQuery, goals.map((g) => g.title), 'goal'), 404);
      }
      goal = result.match;
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const newTx = await tx.transaction.create({
        data: {
          userId: req.userId,
          amount: intent.amount,
          type: 'income',
          category: intent.category,
          date: new Date(),
          accountId: cashAccount ? cashAccount.id : null,
        },
      });
      if (cashAccount) {
        await tx.account.update({ where: { id: cashAccount.id }, data: { balance: cashAccount.balance + intent.amount } });
      }
      if (goal) {
        await tx.goal.update({ where: { id: goal.id }, data: { currentAmount: goal.currentAmount + intent.amount } });
      }
      return newTx;
    });

    return res.status(201).json({
      type: 'income',
      message: goal
        ? `Logged M${intent.amount.toFixed(2)} income and added it to "${goal.title}"`
        : `Logged M${intent.amount.toFixed(2)} income`,
      data: transaction,
    });
  }

  if (intent.type === 'goal_create') {
    const goal = await prisma.goal.create({
      data: { userId: req.userId, title: intent.title, targetAmount: intent.targetAmount },
    });
    return res.status(201).json({
      type: 'goal_create',
      message: `Created goal "${goal.title}" — target M${goal.targetAmount.toFixed(2)}`,
      data: goal,
    });
  }

  if (intent.type === 'goal_contribute') {
    const goals = await prisma.goal.findMany({ where: { userId: req.userId } });
    const result = fuzzyFind(goals, intent.query, (g) => g.title);
    if (!result.match) {
      throw new AppError(notFoundMessage(result, intent.query, goals.map((g) => g.title), 'goal'), 404);
    }
    const goal = result.match;

    const available = await getAvailableBalance(req.userId);
    if (intent.amount > available) {
      throw new AppError(`You only have M${available.toFixed(2)} available — can't add M${intent.amount.toFixed(2)}`, 400);
    }

    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data: { currentAmount: goal.currentAmount + intent.amount },
    });

    return res.json({
      type: 'goal_contribute',
      message: `Added M${intent.amount.toFixed(2)} to "${goal.title}" (M${updated.currentAmount.toFixed(2)} / M${updated.targetAmount.toFixed(2)})`,
      data: updated,
    });
  }

  if (intent.type === 'circle_contribute') {
    const memberships = await prisma.circleMember.findMany({
      where: { userId: req.userId },
      include: { circle: true },
    });
    const result = fuzzyFind(memberships, intent.query, (m) => m.circle.name);
    if (!result.match) {
      throw new AppError(notFoundMessage(result, intent.query, memberships.map((m) => m.circle.name), 'circle'), 404);
    }
    const membership = result.match;

    const contribution = await prisma.contribution.create({
      data: { memberId: membership.id, amount: intent.amount, status: 'paid', datePaid: new Date() },
    });

    return res.status(201).json({
      type: 'circle_contribute',
      message: `Contributed M${intent.amount.toFixed(2)} to "${membership.circle.name}"`,
      data: contribution,
    });
  }

  throw new AppError('Could not process that command', 400);
});

module.exports = { runCommand };