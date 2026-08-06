const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth.middleware');
const { runCommand } = require('../controllers/quickCapture.controller');

router.use(requireAuth);
router.post('/', runCommand);

module.exports = router;