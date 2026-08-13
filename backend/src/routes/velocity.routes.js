const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth.middleware');
const { getWarnings, getSettings, updateSettings } = require('../controllers/velocity.controller');

router.use(requireAuth);
router.get('/', getWarnings);
router.get('/settings', getSettings);
router.post('/settings', updateSettings);

module.exports = router;