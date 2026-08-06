const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth.middleware');
const {
  getGoals,
  createGoal,
  updateGoal,
  getBalanceSummary,
  contributeToGoal,
  deleteGoal,
} = require('../controllers/goals.controller');

router.use(requireAuth);

router.get('/', getGoals);
router.get('/balance', getBalanceSummary);
router.post('/', createGoal);
router.patch('/:id', updateGoal);
router.patch('/:id/contribute', contributeToGoal);
router.delete('/:id', deleteGoal);

module.exports = router;