const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth.middleware');
const { getBudgets, createBudget, deleteBudget } = require('../controllers/budgets.controller');

router.use(requireAuth);
router.get('/', getBudgets);
router.post('/', createBudget);
router.delete('/:id', deleteBudget);

module.exports = router;