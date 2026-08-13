const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const transactionsRoutes = require('./routes/transactions.routes');
const goalsRoutes = require('./routes/goals.routes');
const circlesRoutes = require('./routes/circles.routes');
const recurringRoutes = require('./routes/recurring.routes');
const quickCaptureRoutes = require('./routes/quickCapture.routes');
const accountsRoutes = require('./routes/accounts.routes');
const budgetsRoutes = require('./routes/budgets.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const pushRoutes = require('./routes/push.routes');
const velocityRoutes = require('./routes/velocity.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/circles', circlesRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/quickcapture', quickCaptureRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/velocity', velocityRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;