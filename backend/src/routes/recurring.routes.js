const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth.middleware');
const { getRecurring, createRecurring, deactivateRecurring } = require('../controllers/recurring.controller');

router.use(requireAuth);

router.get('/', getRecurring);
router.post('/', createRecurring);
router.patch('/:id/deactivate', deactivateRecurring);

module.exports = router;