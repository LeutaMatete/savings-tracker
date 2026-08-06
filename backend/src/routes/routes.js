const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth.middleware');
const {
  createCircle,
  getAllCircles,
  getMyCircles,
  joinCircle,
  contribute,
  triggerPayout,
} = require('../controllers/circles.controller');

router.use(requireAuth);

router.get('/mine', getMyCircles);
router.get('/', getAllCircles);
router.post('/', createCircle);
router.post('/:id/join', joinCircle);
router.post('/:id/contribute', contribute);
router.post('/:id/payout', triggerPayout);

module.exports = router;