const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth.middleware');
const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactions.controller');

router.use(requireAuth);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.patch('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;