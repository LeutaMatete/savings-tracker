const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth.middleware');
const { getAccounts, createAccount } = require('../controllers/accounts.controller');

router.use(requireAuth);
router.get('/', getAccounts);
router.post('/', createAccount);

module.exports = router;