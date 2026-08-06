const cron = require('node-cron');
const prisma = require('../lib/prisma');

function isDueToday(recurring, today) {
  if (recurring.lastRunDate) {
    const last = new Date(recurring.lastRunDate);
    if (last.toDateString() === today.toDateString()) return false;
  }
  if (recurring.frequency === 'monthly') {
    return today.getDate() === recurring.dayOfMonth;
  }
  if (recurring.frequency === 'weekly') {
    return today.getDay() === recurring.dayOfWeek;
  }
  return false;
}

async function runDueRecurringTransactions() {
  const today = new Date();
  const dueCandidates = await prisma.recurringTransaction.findMany({ where: { active: true } });

  for (const recurring of dueCandidates) {
    if (!isDueToday(recurring, today)) continue;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId: recurring.userId,
            amount: recurring.amount,
            type: recurring.type,
            category: recurring.category,
            date: today,
            accountId: recurring.accountId,
          },
        });

        if (recurring.accountId) {
          const account = await tx.account.findUnique({ where: { id: recurring.accountId } });
          if (account) {
            const delta = recurring.type === 'income' ? recurring.amount : -recurring.amount;
            await tx.account.update({ where: { id: account.id }, data: { balance: account.balance + delta } });
          }
        }

        if (recurring.goalId) {
          const goal = await tx.goal.findUnique({ where: { id: recurring.goalId } });
          if (goal) {
            await tx.goal.update({
              where: { id: goal.id },
              data: { currentAmount: goal.currentAmount + recurring.amount },
            });
          }
        }

        await tx.recurringTransaction.update({
          where: { id: recurring.id },
          data: { lastRunDate: today },
        });
      });

      console.log(`✅ Ran recurring transaction ${recurring.id}`);
    } catch (error) {
      console.error(`Failed to run recurring transaction ${recurring.id}:`, error);
    }
  }
}

function startRecurringTransactionsJob() {
  cron.schedule('5 0 * * *', runDueRecurringTransactions);
  console.log('🕐 Recurring transactions job scheduled');
}

module.exports = { startRecurringTransactionsJob, runDueRecurringTransactions };