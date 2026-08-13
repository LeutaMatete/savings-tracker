const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { computeVelocityWarnings } = require('../utils/velocity');

const getWarnings = asyncHandler(async (req, res) => {
  const warnings = await computeVelocityWarnings(req.userId);
  res.json(warnings);
});

const getSettings = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  res.json({ velocityAlertsEnabled: user.velocityAlertsEnabled });
});

const updateSettings = asyncHandler(async (req, res) => {
  const { velocityAlertsEnabled } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { velocityAlertsEnabled: !!velocityAlertsEnabled },
  });
  res.json({ velocityAlertsEnabled: user.velocityAlertsEnabled });
});

module.exports = { getWarnings, getSettings, updateSettings };