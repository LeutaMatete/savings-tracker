const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth.middleware');
const {
  subscribe, updateSettings, unsubscribe, getSettings, getTodayBriefing, sendTestBriefing,
} = require('../controllers/push.controller');

router.use(requireAuth);
router.get('/settings', getSettings);
router.get('/today', getTodayBriefing);
router.post('/subscribe', subscribe);
router.post('/settings', updateSettings);
router.post('/unsubscribe', unsubscribe);
router.post('/test', sendTestBriefing);

module.exports = router;