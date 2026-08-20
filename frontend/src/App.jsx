import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Home, ArrowLeftRight, Target, Users, Repeat, LogOut, Sun,
  ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, MoreHorizontal,
} from 'lucide-react';
import BottomNavBar from './components/BottomNavBar';
import api, { setOnUnauthorized } from './api';

const CHART_COLORS = ['#00D3F2', '#39FF88', '#FFB454', '#FF4D6D', '#8C5CF7', '#5CA7F7'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TABS = [
  { id: 'overview', label: 'Home', icon: Home },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'circles', label: 'Circles', icon: Users },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'briefing', label: 'Briefing', icon: Sun },
];

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);

  const [dashboard, setDashboard] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [txForm, setTxForm] = useState({ amount: '', type: 'expense', category: '', goalId: '', accountId: '' });
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [editingTxId, setEditingTxId] = useState(null);
  const [editTxForm, setEditTxForm] = useState({ amount: '', category: '' });

  const [goals, setGoals] = useState([]);
  const [goalForm, setGoalForm] = useState({ title: '', targetAmount: '' });
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editGoalForm, setEditGoalForm] = useState({ title: '', targetAmount: '' });
  const [contributeAmounts, setContributeAmounts] = useState({});
  const [contributingGoalId, setContributingGoalId] = useState(null);

  const [circles, setCircles] = useState([]);
  const [circleForm, setCircleForm] = useState({ name: '', contributionAmount: '', frequency: 'monthly', payoutType: 'rotating', targetAmount: '' });

  const [recurring, setRecurring] = useState([]);
  const [recurringForm, setRecurringForm] = useState({ amount: '', type: 'expense', category: '', frequency: 'monthly', dayOfMonth: '1', dayOfWeek: '1', goalId: '', accountId: '' });

  const [budgetForm, setBudgetForm] = useState({ category: '', monthlyLimit: '' });
  const [submittingBudget, setSubmittingBudget] = useState(false);

  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [submittingTx, setSubmittingTx] = useState(false);
  const [submittingGoal, setSubmittingGoal] = useState(false);
  const [submittingCircle, setSubmittingCircle] = useState(false);
  const [submittingRecurring, setSubmittingRecurring] = useState(false);
  const [contributingId, setContributingId] = useState(null);
  const [payingOutId, setPayingOutId] = useState(null);

  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('commandHistory') || '[]'); } catch { return []; }
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandResult, setCommandResult] = useState(null);
  const [submittingCommand, setSubmittingCommand] = useState(false);
  const [showCommandHelp, setShowCommandHelp] = useState(false);

  const [velocityWarnings, setVelocityWarnings] = useState([]);
  const [velocityAlertsEnabled, setVelocityAlertsEnabled] = useState(false);
  const [savingVelocitySettings, setSavingVelocitySettings] = useState(false);

  const [briefingSettings, setBriefingSettings] = useState({ briefingEnabled: false, briefingHour: 7, briefingMinute: 0 });
  const [todayBriefing, setTodayBriefing] = useState(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [savingBriefingSettings, setSavingBriefingSettings] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  function showToast(message, type = 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    setOnUnauthorized(() => {
      handleLogout();
      showToast('Your session expired. Please log in again.', 'error');
    });
  }, []);

  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  useEffect(() => {
  if (token) {
    fetchDashboard();
    fetchTransactions();
    fetchGoals();
    fetchCircles();
    fetchRecurring();
    fetchBriefingSettings();
    fetchTodayBriefing();
    fetchVelocityWarnings();
    fetchVelocitySettings();
  }
}, [token]);

  useEffect(() => {
    localStorage.setItem('commandHistory', JSON.stringify(commandHistory));
  }, [commandHistory]);

async function fetchVelocityWarnings() {
  try {
    const res = await api.get('/velocity');
    setVelocityWarnings(res.data);
  } catch (err) { /* silent */ }
}

async function fetchVelocitySettings() {
  try {
    const res = await api.get('/velocity/settings');
    setVelocityAlertsEnabled(res.data.velocityAlertsEnabled);
  } catch (err) { /* silent */ }
}

async function handleToggleVelocityAlerts() {
  setSavingVelocitySettings(true);
  try {
    const next = !velocityAlertsEnabled;
    await api.post('/velocity/settings', { velocityAlertsEnabled: next });
    setVelocityAlertsEnabled(next);
    showToast(next ? 'Spending pace alerts enabled' : 'Spending pace alerts disabled', 'success');
  } catch (err) { showToast(err.friendlyMessage); }
  finally { setSavingVelocitySettings(false); }
}

  async function fetchDashboard() {
    try { const res = await api.get('/dashboard'); setDashboard(res.data); }
    catch (err) { showToast(err.friendlyMessage); }
  }
  async function fetchTransactions(filters = dateFilter) {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const res = await api.get('/transactions', { params });
      setTransactions(res.data);
    } catch (err) { showToast(err.friendlyMessage); }
  }
  async function fetchGoals() {
    try { const res = await api.get('/goals'); setGoals(res.data); }
    catch (err) { showToast(err.friendlyMessage); }
  }
  async function fetchCircles() {
    try { const res = await api.get('/circles/mine'); setCircles(res.data); }
    catch (err) { showToast(err.friendlyMessage); }
  }
  async function fetchRecurring() {
    try { const res = await api.get('/recurring'); setRecurring(res.data); }
    catch (err) { showToast(err.friendlyMessage); }
  }
  async function fetchBriefingSettings() {
    try {
      const res = await api.get('/push/settings');
      setBriefingSettings({
        briefingEnabled: res.data.briefingEnabled,
        briefingHour: res.data.briefingHour ?? 7,
        briefingMinute: res.data.briefingMinute ?? 0,
      });
    } catch (err) { /* silent — not critical */ }
  }
  async function fetchTodayBriefing() {
    try { const res = await api.get('/push/today'); setTodayBriefing(res.data.text); }
    catch (err) { /* silent */ }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError('');
    setSubmittingAuth(true);
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/signup';
      const res = await api.post(endpoint, form);
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    } catch (err) { setAuthError(err.friendlyMessage); }
    finally { setSubmittingAuth(false); }
  }

  function handleLogout() {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setDashboard(null);
    setTransactions([]);
    setGoals([]);
    setCircles([]);
    setRecurring([]);
  }

  async function handleTxSubmit(e) {
    e.preventDefault();
    setSubmittingTx(true);
    try {
      const payload = { ...txForm };
      if (!payload.goalId) delete payload.goalId;
      if (!payload.accountId) delete payload.accountId;
      if (payload.type === 'income') delete payload.category;
      await api.post('/transactions', payload);
      setTxForm({ amount: '', type: 'expense', category: '', goalId: '', accountId: '' });
      await Promise.all([fetchTransactions(), fetchGoals(), fetchDashboard()]);
      showToast('Transaction added', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
    finally { setSubmittingTx(false); }
  }

  async function handleDeleteTx(id) {
    try {
      await api.delete(`/transactions/${id}`);
      await Promise.all([fetchTransactions(), fetchDashboard()]);
      showToast('Transaction removed', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
  }

  function handleFilterSubmit(e) { e.preventDefault(); fetchTransactions(dateFilter); }
  function clearFilter() { const c = { startDate: '', endDate: '' }; setDateFilter(c); fetchTransactions(c); }
  function startEditTx(tx) { setEditingTxId(tx.id); setEditTxForm({ amount: tx.amount, category: tx.category || '' }); }
  function cancelEditTx() { setEditingTxId(null); }

  async function saveEditTx(id) {
    try {
      await api.patch(`/transactions/${id}`, editTxForm);
      setEditingTxId(null);
      await Promise.all([fetchTransactions(), fetchDashboard()]);
      showToast('Transaction updated', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
  }

  async function handleGoalSubmit(e) {
    e.preventDefault();
    setSubmittingGoal(true);
    try {
      await api.post('/goals', goalForm);
      setGoalForm({ title: '', targetAmount: '' });
      await Promise.all([fetchGoals(), fetchDashboard()]);
      showToast('Goal added', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
    finally { setSubmittingGoal(false); }
  }

  function startEditGoal(g) { setEditingGoalId(g.id); setEditGoalForm({ title: g.title, targetAmount: g.targetAmount }); }
  function cancelEditGoal() { setEditingGoalId(null); }

  async function saveEditGoal(id) {
    try {
      await api.patch(`/goals/${id}`, editGoalForm);
      setEditingGoalId(null);
      await Promise.all([fetchGoals(), fetchDashboard()]);
      showToast('Goal updated', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
  }

  async function handleAddToGoal(goalId) {
    const amount = contributeAmounts[goalId];
    if (!amount || parseFloat(amount) <= 0) { showToast('Enter an amount to add first'); return; }
    setContributingGoalId(goalId);
    try {
      await api.patch(`/goals/${goalId}/contribute`, { amount });
      setContributeAmounts({ ...contributeAmounts, [goalId]: '' });
      await Promise.all([fetchGoals(), fetchDashboard()]);
      showToast('Money added to goal', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
    finally { setContributingGoalId(null); }
  }

  async function handleCircleSubmit(e) {
    e.preventDefault();
    setSubmittingCircle(true);
    try {
      const payload = { ...circleForm };
      if (payload.payoutType !== 'pooled') delete payload.targetAmount;
      await api.post('/circles', payload);
      setCircleForm({ name: '', contributionAmount: '', frequency: 'monthly', payoutType: 'rotating', targetAmount: '' });
      await fetchCircles();
      showToast('Circle created', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
    finally { setSubmittingCircle(false); }
  }

  async function handleContribute(circleId) {
    const amount = prompt('How much are you contributing?');
    if (!amount) return;
    setContributingId(circleId);
    try {
      await api.post(`/circles/${circleId}/contribute`, { amount });
      await fetchCircles();
      showToast('Contribution recorded', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
    finally { setContributingId(null); }
  }

  async function handleTriggerPayout(circleId) {
    setPayingOutId(circleId);
    try {
      const res = await api.post(`/circles/${circleId}/payout`);
      await fetchCircles();
      showToast(res.data.message, 'success');
    } catch (err) { showToast(err.friendlyMessage); }
    finally { setPayingOutId(null); }
  }

  async function handleRecurringSubmit(e) {
    e.preventDefault();
    setSubmittingRecurring(true);
    try {
      const payload = { ...recurringForm };
      if (payload.type === 'income') delete payload.category;
      if (payload.frequency === 'monthly') delete payload.dayOfWeek;
      if (payload.frequency === 'weekly') delete payload.dayOfMonth;
      if (!payload.goalId) delete payload.goalId;
      if (!payload.accountId) delete payload.accountId;
      await api.post('/recurring', payload);
      setRecurringForm({ amount: '', type: 'expense', category: '', frequency: 'monthly', dayOfMonth: '1', dayOfWeek: '1', goalId: '', accountId: '' });
      await fetchRecurring();
      showToast('Recurring transaction scheduled', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
    finally { setSubmittingRecurring(false); }
  }

  async function handleStopRecurring(id) {
    try {
      await api.patch(`/recurring/${id}/deactivate`);
      await fetchRecurring();
      showToast('Recurring transaction stopped', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
  }

  async function handleBudgetSubmit(e) {
    e.preventDefault();
    setSubmittingBudget(true);
    try {
      await api.post('/budgets', budgetForm);
      setBudgetForm({ category: '', monthlyLimit: '' });
      await fetchDashboard();
      showToast('Budget set', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
    finally { setSubmittingBudget(false); }
  }

  async function handleDeleteBudget(id) {
    try { await api.delete(`/budgets/${id}`); await fetchDashboard(); showToast('Budget removed', 'success'); }
    catch (err) { showToast(err.friendlyMessage); }
  }

  async function handleCommandSubmit(e) {
    e.preventDefault();
    const trimmed = commandInput.trim();
    if (!trimmed) return;
    setSubmittingCommand(true);
    try {
      const res = await api.post('/quickcapture', { command: trimmed });
      setCommandHistory((prev) => [trimmed, ...prev.filter((c) => c !== trimmed)].slice(0, 20));
      setHistoryIndex(-1);
      setCommandInput('');
      setCommandResult({ message: res.data.message, type: 'success' });
      showToast(res.data.message, 'success');
      await Promise.all([fetchTransactions(), fetchGoals(), fetchCircles(), fetchDashboard()]);
    } catch (err) {
      setCommandResult({ message: err.friendlyMessage, type: 'error' });
      showToast(err.friendlyMessage);
    } finally { setSubmittingCommand(false); }
  }

  function handleCommandKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(nextIndex);
      setCommandInput(commandHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) { setHistoryIndex(-1); setCommandInput(''); return; }
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setCommandInput(commandHistory[nextIndex]);
    }
  }

  async function handleEnableBriefing() {
    if (!pushSupported) {
      showToast('Push notifications are not supported in this browser');
      return;
    }
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Notification permission was not granted');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const { data } = await api.get('/push/vapid-public-key');
      if (!data.publicKey) {
        showToast('Push notifications are not configured on the server yet');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      const timezoneOffsetMinutes = new Date().getTimezoneOffset();

      await api.post('/push/subscribe', { subscription, timezoneOffsetMinutes });
      await api.post('/push/settings', {
        briefingEnabled: true,
        briefingHour: briefingSettings.briefingHour,
        briefingMinute: briefingSettings.briefingMinute,
        timezoneOffsetMinutes,
      });

      setBriefingSettings((prev) => ({ ...prev, briefingEnabled: true }));
      showToast('Morning briefing enabled', 'success');
    } catch (err) {
      showToast('Could not enable notifications — ' + (err.message || 'unknown error'));
    } finally {
      setSubscribing(false);
    }
  }

  async function handleSaveBriefingTime(e) {
    e.preventDefault();
    setSavingBriefingSettings(true);
    try {
      const timezoneOffsetMinutes = new Date().getTimezoneOffset();
      await api.post('/push/settings', {
        briefingHour: parseInt(briefingSettings.briefingHour),
        briefingMinute: parseInt(briefingSettings.briefingMinute),
        timezoneOffsetMinutes,
      });
      showToast('Briefing time saved', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
    finally { setSavingBriefingSettings(false); }
  }

  async function handleDisableBriefing() {
    try {
      await api.post('/push/unsubscribe', {});
      setBriefingSettings((prev) => ({ ...prev, briefingEnabled: false }));
      showToast('Briefing disabled', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
  }

  async function handleSendTest() {
    setSendingTest(true);
    try {
      const res = await api.post('/push/test');
      showToast('Test notification sent', 'success');
    } catch (err) { showToast(err.friendlyMessage); }
    finally { setSendingTest(false); }
  }

  if (!token) {
    return (
      <div className="auth-screen">
        {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
        <div className="auth-panel">
          <div className="auth-card">
            <p className="eyebrow">FOD</p>
            <h1>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
            <p className="auth-subtitle">
              {authMode === 'login' ? 'Log in to see your finances.' : 'Takes less than a minute.'}
            </p>
            <form onSubmit={handleAuthSubmit} className="form">
              {authMode === 'signup' && (
                <label className="field">
                  <span>Name</span>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                </label>
              )}
              <label className="field">
                <span>Email</span>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
              </label>
              <label className="field">
                <span>Password</span>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              </label>
              {authError && <p className="form-error">{authError}</p>}
              <button type="submit" className="btn btn-primary btn-block" disabled={submittingAuth}>
                {submittingAuth ? 'Please wait…' : authMode === 'login' ? 'Log in' : 'Sign up'}
              </button>
            </form>
            <button className="link-btn" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}>
              {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const categoryTotals = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => { const key = t.category || 'Other'; acc[key] = (acc[key] || 0) + t.amount; return acc; }, {});
  const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  const accountOptions = dashboard?.accounts || [];
  const monthDelta = dashboard ? dashboard.monthIncome - dashboard.monthExpense : 0;
  const initial = (user?.name || '?').charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <header className="topbar">
        <div className="topbar-user">
          <div className="avatar">{initial}</div>
          <div>
            <p className="topbar-label">Personal account</p>
            <p className="topbar-name">{user?.name}</p>
          </div>
        </div>
        <button className="round-icon-btn" onClick={handleLogout} aria-label="Log out">
          <LogOut size={17} />
        </button>
      </header>

      <main className="main">
        {todayBriefing && (
          <div className="briefing-banner">
            <Sun size={16} />
            <p>{todayBriefing}</p>
          </div>
        )}

        {velocityWarnings.map((w) => (
  <div key={w.budgetId} className="velocity-banner">
    <TrendingUp size={16} />
    <p>{w.message}</p>
  </div>
))}

        <div className="command-bar">
          <form onSubmit={handleCommandSubmit} className="command-form">
            <span className="command-prompt">›</span>
            <input
              className="command-input"
              placeholder='Try "-50 lunch", "+1500 salary", "goal laptop-fund +500"'
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={handleCommandKeyDown}
              disabled={submittingCommand}
            />
            <button type="button" className="command-help-btn" onClick={() => setShowCommandHelp(!showCommandHelp)}>?</button>
          </form>
          {commandResult && <p className={`command-result command-result-${commandResult.type}`}>{commandResult.message}</p>}
          {showCommandHelp && (
            <div className="command-help">
              <p><span className="mono">-50 lunch</span> — log an expense, category guessed automatically</p>
              <p><span className="mono">+1500 salary</span> — log income</p>
              <p><span className="mono">+1500 salary @laptop-fund</span> — log income and add it straight to a goal</p>
              <p><span className="mono">goal new laptop-fund 5000</span> — create a new goal with a target</p>
              <p><span className="mono">goal laptop-fund +500</span> — add money to an existing goal</p>
              <p><span className="mono">circle family-savings +200</span> — contribute to a savings circle</p>
              <p><span className="mono">balance</span> — check what's available to spend or save</p>
              <p className="command-help-tip">Use ↑ / ↓ to reuse recent commands.</p>
            </div>
          )}
        </div>

        <div className="segmented-tabs">
          {TABS.map((tab) => (
            <button key={tab.id} className={`segmented-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && dashboard && (
          <section>
            <div className="hero-card">
              <div className="hero-top">
                <p className="hero-label">Net worth</p>
                <button className="round-icon-btn ghost"><MoreHorizontal size={16} /></button>
              </div>
              <p className="hero-balance">M{dashboard.netWorth.toFixed(2)}</p>
              <p className={`hero-delta ${monthDelta >= 0 ? 'positive' : 'negative'}`}>
                {monthDelta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                M{Math.abs(monthDelta).toFixed(2)} this month
              </p>
              <div className="hero-actions">
                <button className="hero-btn dark" onClick={() => setActiveTab('transactions')}>
                  <ArrowDownLeft size={16} /> Add expense
                </button>
                <button className="hero-btn lime" onClick={() => setActiveTab('transactions')}>
                  <ArrowUpRight size={16} /> Add income
                </button>
              </div>
            </div>

            <div className="section-head"><h2>My accounts</h2></div>
            <div className="account-scroll">
              {dashboard.accounts.map((a) => (
                <div key={a.id} className="account-chip">
                  <p className="account-type">{a.type}</p>
                  <p className="account-name">{a.name}</p>
                  <p className="mono account-balance">M{a.balance.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="stat-grid">
              <div className="stat-card">
                <p className="stat-label">Income this month</p>
                <p className="stat-value mono positive">M{dashboard.monthIncome.toFixed(2)}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Spending this month</p>
                <p className="stat-value mono negative">M{dashboard.monthExpense.toFixed(2)}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Circles joined</p>
                <p className="stat-value">{circles.length}</p>
              </div>
            </div>

            <div className="chart-card">
              <h2>Savings progress</h2>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${dashboard.savings.progressPct}%` }} /></div>
              <p className="mono goal-amounts">
                M{dashboard.savings.totalSaved.toFixed(2)} / M{dashboard.savings.totalTarget.toFixed(2)} saved across all goals
              </p>
            </div>

            {categoryData.length > 0 && (
              <div className="chart-card">
                <h2>Spending by category</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={{ fill: '#E8F6F8', fontSize: 12 }}>
                      {categoryData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `M${value.toFixed(2)}`} contentStyle={{ background: '#140B22', border: '1px solid rgba(0,211,242,0.3)', borderRadius: 10 }} itemStyle={{ color: '#E8F6F8' }} labelStyle={{ color: '#00D3F2' }} />
                    <Legend wrapperStyle={{ color: '#E8F6F8', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="dashboard-columns">
              <div className="chart-card">
                <h2>Upcoming bills</h2>
                {dashboard.upcomingBills.length === 0 ? (
                  <p className="empty-state">Nothing due in the next 14 days.</p>
                ) : (
                  <ul className="list">
                    {dashboard.upcomingBills.map((b) => (
                      <li key={b.id} className="list-row">
                        <span className="badge expense">−</span>
                        <span className="list-main">{b.category} · due {new Date(b.nextDue).toLocaleDateString()}</span>
                        <span className="mono">M{b.amount.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="chart-card">
                <h2>Recent transactions</h2>
                {dashboard.recentTransactions.length === 0 ? (
                  <p className="empty-state">No transactions yet.</p>
                ) : (
                  <ul className="list">
                    {dashboard.recentTransactions.map((tx) => (
                      <li key={tx.id} className="list-row">
                        <span className={`badge ${tx.type}`}>{tx.type === 'income' ? '+' : '−'}</span>
                        <span className="list-main">{tx.type === 'income' ? 'Income' : tx.category}</span>
                        <span className="mono">M{tx.amount.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="chart-card">
              <h2>Budget status</h2>
              <form onSubmit={handleBudgetSubmit} className="form form-row">
                <input placeholder="Category" value={budgetForm.category} onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })} />
                <input placeholder="Monthly limit" type="number" value={budgetForm.monthlyLimit} onChange={(e) => setBudgetForm({ ...budgetForm, monthlyLimit: e.target.value })} />
                <button type="submit" className="btn btn-primary" disabled={submittingBudget}>{submittingBudget ? 'Setting…' : 'Set budget'}</button>
              </form>
              {dashboard.budgetStatus.length === 0 ? (
                <p className="empty-state">No budgets set yet — add one above.</p>
              ) : (
                <div className="goal-grid">
                  {dashboard.budgetStatus.map((b) => (
                    <div key={b.id} className="goal-card">
                      <p className="goal-title">{b.category}</p>
                      <div className="progress-track"><div className={`progress-fill ${b.overBudget ? 'over-budget' : ''}`} style={{ width: `${b.pct}%` }} /></div>
                      <p className="mono goal-amounts">M{b.spent.toFixed(2)} / M{b.monthlyLimit.toFixed(2)}{b.overBudget ? ' — over budget' : ''}</p>
                      <button className="icon-btn" onClick={() => handleDeleteBudget(b.id)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'transactions' && (
          <section>
            <h1>Transactions</h1>
            <form onSubmit={handleFilterSubmit} className="form form-row filter-row">
              <label className="field-inline"><span>From</span><input type="date" value={dateFilter.startDate} onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })} /></label>
              <label className="field-inline"><span>To</span><input type="date" value={dateFilter.endDate} onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })} /></label>
              <button type="submit" className="btn btn-secondary">Filter</button>
              <button type="button" className="link-btn" onClick={clearFilter}>Clear</button>
            </form>

            <form onSubmit={handleTxSubmit} className="form form-row">
              <input placeholder="Amount" type="number" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} />
              <select value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value, category: '', goalId: e.target.value === 'expense' ? '' : txForm.goalId })}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              {txForm.type === 'expense' && (
                <input placeholder="Category" value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })} />
              )}
              <select value={txForm.accountId} onChange={(e) => setTxForm({ ...txForm, accountId: e.target.value })}>
                <option value="">Cash (default)</option>
                {accountOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {txForm.type === 'income' && goals.length > 0 && (
                <select value={txForm.goalId} onChange={(e) => setTxForm({ ...txForm, goalId: e.target.value })}>
                  <option value="">Don't add to a goal</option>
                  {goals.map((g) => <option key={g.id} value={g.id}>Add to: {g.title}</option>)}
                </select>
              )}
              <button type="submit" className="btn btn-primary" disabled={submittingTx}>{submittingTx ? 'Adding…' : 'Add'}</button>
            </form>

            {transactions.length === 0 ? (
              <p className="empty-state">No transactions yet — add your first one above.</p>
            ) : (
              <ul className="list">
                {transactions.map((tx) => (
                  <li key={tx.id} className="list-row">
                    {editingTxId === tx.id ? (
                      <>
                        <input type="number" className="edit-input" value={editTxForm.amount} onChange={(e) => setEditTxForm({ ...editTxForm, amount: e.target.value })} />
                        {tx.type === 'expense' && <input className="edit-input" value={editTxForm.category} onChange={(e) => setEditTxForm({ ...editTxForm, category: e.target.value })} />}
                        <button className="icon-btn" onClick={() => saveEditTx(tx.id)}>Save</button>
                        <button className="icon-btn" onClick={cancelEditTx}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <span className={`badge ${tx.type}`}>{tx.type === 'income' ? '+' : '−'}</span>
                        <span className="list-main">{tx.type === 'income' ? 'Income' : tx.category}</span>
                        <span className="mono">M{tx.amount.toFixed(2)}</span>
                        <button className="icon-btn" onClick={() => startEditTx(tx)}>Edit</button>
                        <button className="icon-btn" onClick={() => handleDeleteTx(tx.id)}>Remove</button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === 'goals' && (
          <section>
            <h1>Goals</h1>
            <p className="available-balance">
              Available to put toward goals: <span className="mono">M{((dashboard?.netWorth || 0) - (dashboard?.savings?.totalSaved || 0)).toFixed(2)}</span>
            </p>
            <form onSubmit={handleGoalSubmit} className="form form-row">
              <input placeholder="Goal title" value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} />
              <input placeholder="Target amount" type="number" value={goalForm.targetAmount} onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })} />
              <button type="submit" className="btn btn-primary" disabled={submittingGoal}>{submittingGoal ? 'Adding…' : 'Add goal'}</button>
            </form>

            {goals.length === 0 ? (
              <p className="empty-state">No goals yet — set something you're saving toward.</p>
            ) : (
              <div className="goal-grid">
                {goals.map((g) => {
                  const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
                  return (
                    <div key={g.id} className="goal-card">
                      {editingGoalId === g.id ? (
                        <>
                          <input className="edit-input" value={editGoalForm.title} onChange={(e) => setEditGoalForm({ ...editGoalForm, title: e.target.value })} />
                          <input className="edit-input" type="number" value={editGoalForm.targetAmount} onChange={(e) => setEditGoalForm({ ...editGoalForm, targetAmount: e.target.value })} />
                          <div className="edit-actions">
                            <button className="icon-btn" onClick={() => saveEditGoal(g.id)}>Save</button>
                            <button className="icon-btn" onClick={cancelEditGoal}>Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="goal-title">{g.title}</p>
                          <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                          <p className="mono goal-amounts">M{g.currentAmount.toFixed(2)} / M{g.targetAmount.toFixed(2)}</p>
                          <div className="goal-add-panel">
                            <p className="goal-add-label">Add money to this goal</p>
                            <div className="goal-add-row">
                              <div className="amount-input-wrap">
                                <span>M</span>
                                <input type="number" placeholder="0.00" value={contributeAmounts[g.id] || ''} onChange={(e) => setContributeAmounts({ ...contributeAmounts, [g.id]: e.target.value })} />
                              </div>
                              <button className="btn btn-primary" onClick={() => handleAddToGoal(g.id)} disabled={contributingGoalId === g.id}>
                                {contributingGoalId === g.id ? 'Adding…' : 'Add'}
                              </button>
                            </div>
                          </div>
                          <button className="icon-btn" onClick={() => startEditGoal(g)}>Edit goal</button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'circles' && (
          <section>
            <h1>Circles</h1>
            <form onSubmit={handleCircleSubmit} className="form form-row">
              <input placeholder="Circle name" value={circleForm.name} onChange={(e) => setCircleForm({ ...circleForm, name: e.target.value })} />
              <input placeholder="Contribution amount" type="number" value={circleForm.contributionAmount} onChange={(e) => setCircleForm({ ...circleForm, contributionAmount: e.target.value })} />
              <select value={circleForm.frequency} onChange={(e) => setCircleForm({ ...circleForm, frequency: e.target.value })}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <select value={circleForm.payoutType} onChange={(e) => setCircleForm({ ...circleForm, payoutType: e.target.value, targetAmount: e.target.value === 'rotating' ? '' : circleForm.targetAmount })}>
                <option value="rotating">Rotating</option>
                <option value="pooled">Pooled</option>
              </select>
              {circleForm.payoutType === 'pooled' && (
                <input placeholder="Target amount" type="number" value={circleForm.targetAmount} onChange={(e) => setCircleForm({ ...circleForm, targetAmount: e.target.value })} />
              )}
              <button type="submit" className="btn btn-primary" disabled={submittingCircle}>{submittingCircle ? 'Creating…' : 'Create'}</button>
            </form>

            {circles.length === 0 ? (
              <p className="empty-state">You're not in a circle yet — start one above.</p>
            ) : (
              <div className="circle-grid">
                {circles.map((c) => {
                  const totalPooled = c.members.reduce((sum, m) => sum + m.contributions.reduce((s, ct) => s + ct.amount, 0), 0);
                  const pooledPct = c.targetAmount ? Math.min(100, (totalPooled / c.targetAmount) * 100) : 0;
                  const nextRecipient = c.members.find(m => !m.hasReceivedPayout) || c.members[0];
                  return (
                    <div key={c.id} className="circle-card">
                      <div className="circle-card-body">
                        <p className="circle-name">{c.name}</p>
                        <p className="circle-meta">M{c.contributionAmount} · {c.frequency} · {c.payoutType}</p>
                        <p className="circle-members">{c.members.length} member{c.members.length !== 1 ? 's' : ''}</p>
                        {c.payoutType === 'pooled' && (
                          <>
                            <div className="progress-track"><div className="progress-fill" style={{ width: `${pooledPct}%` }} /></div>
                            <p className="mono goal-amounts">M{totalPooled.toFixed(2)} / M{c.targetAmount?.toFixed(2)}</p>
                          </>
                        )}
                        {c.payoutType === 'rotating' && <p className="circle-meta">Next payout: {nextRecipient?.user?.name || '—'}</p>}
                        <div className="circle-actions">
                          <button className="btn btn-secondary" onClick={() => handleContribute(c.id)} disabled={contributingId === c.id}>
                            {contributingId === c.id ? 'Saving…' : 'Contribute'}
                          </button>
                          {c.payoutType === 'rotating' && (
                            <button className="btn btn-secondary" onClick={() => handleTriggerPayout(c.id)} disabled={payingOutId === c.id}>
                              {payingOutId === c.id ? 'Processing…' : 'Give payout'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'recurring' && (
          <section>
            <h1>Recurring</h1>
            <form onSubmit={handleRecurringSubmit} className="form form-row">
              <input placeholder="Amount" type="number" value={recurringForm.amount} onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })} />
              <select value={recurringForm.type} onChange={(e) => setRecurringForm({ ...recurringForm, type: e.target.value, category: '' })}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              {recurringForm.type === 'expense' && (
                <input placeholder="Category" value={recurringForm.category} onChange={(e) => setRecurringForm({ ...recurringForm, category: e.target.value })} />
              )}
              <select value={recurringForm.frequency} onChange={(e) => setRecurringForm({ ...recurringForm, frequency: e.target.value })}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
              {recurringForm.frequency === 'monthly' ? (
                <select value={recurringForm.dayOfMonth} onChange={(e) => setRecurringForm({ ...recurringForm, dayOfMonth: e.target.value })}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Day {d}</option>)}
                </select>
              ) : (
                <select value={recurringForm.dayOfWeek} onChange={(e) => setRecurringForm({ ...recurringForm, dayOfWeek: e.target.value })}>
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              )}
              <select value={recurringForm.accountId} onChange={(e) => setRecurringForm({ ...recurringForm, accountId: e.target.value })}>
                <option value="">Cash (default)</option>
                {accountOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {recurringForm.type === 'income' && goals.length > 0 && (
                <select value={recurringForm.goalId} onChange={(e) => setRecurringForm({ ...recurringForm, goalId: e.target.value })}>
                  <option value="">Don't add to a goal</option>
                  {goals.map((g) => <option key={g.id} value={g.id}>Add to: {g.title}</option>)}
                </select>
              )}
              <button type="submit" className="btn btn-primary" disabled={submittingRecurring}>{submittingRecurring ? 'Scheduling…' : 'Schedule'}</button>
            </form>

            {recurring.filter(r => r.active).length === 0 ? (
              <p className="empty-state">No recurring transactions yet.</p>
            ) : (
              <ul className="list">
                {recurring.filter(r => r.active).map((r) => (
                  <li key={r.id} className="list-row">
                    <span className={`badge ${r.type}`}>{r.type === 'income' ? '+' : '−'}</span>
                    <span className="list-main">{r.type === 'income' ? 'Income' : r.category} · {r.frequency === 'monthly' ? `Day ${r.dayOfMonth} of month` : DAY_ABBR[r.dayOfWeek]}</span>
                    <span className="mono">M{r.amount.toFixed(2)}</span>
                    <button className="icon-btn" onClick={() => handleStopRecurring(r.id)}>Stop</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === 'briefing' && (
          <section>
            <h1>Morning briefing</h1>
            <p className="available-balance">
              Get a short daily summary of your spending, goal progress, and bills due — sent as a push notification at whatever time you choose.
            </p>

            {!pushSupported && (
              <p className="empty-state">Your browser doesn't support push notifications. Try Chrome, Firefox, or Edge — or on iPhone, install this app to your home screen first (Safari share menu → Add to Home Screen), then enable it from there.</p>
            )}

            {pushSupported && (
              <div className="chart-card">
                {!briefingSettings.briefingEnabled ? (
                  <>
                    <h2>Enable notifications</h2>
                    <p className="goal-amounts">Turn this on to start receiving your daily briefing.</p>
                    <button className="btn btn-primary" onClick={handleEnableBriefing} disabled={subscribing}>
                      {subscribing ? 'Enabling…' : 'Enable morning briefing'}
                    </button>
                  </>
                ) : (
                  <>
                    <h2>Briefing time</h2>
                    <form onSubmit={handleSaveBriefingTime} className="form form-row">
                      <select value={briefingSettings.briefingHour} onChange={(e) => setBriefingSettings({ ...briefingSettings, briefingHour: e.target.value })}>
                        {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>)}
                      </select>
                      <select value={briefingSettings.briefingMinute} onChange={(e) => setBriefingSettings({ ...briefingSettings, briefingMinute: e.target.value })}>
                        {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
                      </select>
                      <button type="submit" className="btn btn-primary" disabled={savingBriefingSettings}>
                        {savingBriefingSettings ? 'Saving…' : 'Save time'}
                      </button>
                    </form>
                    <div className="edit-actions">
                      <button className="icon-btn" onClick={handleSendTest} disabled={sendingTest}>
                        {sendingTest ? 'Sending…' : 'Send test now'}
                      </button>
                      <button className="icon-btn" onClick={handleDisableBriefing}>Disable</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {todayBriefing && (
              <div className="chart-card">
                <h2>Today's briefing preview</h2>
                <p className="goal-amounts">{todayBriefing}</p>
              </div>
            )}

{pushSupported && (
  <div className="chart-card">
    <h2>Spending pace alerts</h2>
    <p className="goal-amounts">
      Get warned mid-month if you're burning through a budget category faster than usual — before it actually runs out.
    </p>
    <button
      className={velocityAlertsEnabled ? 'btn btn-secondary' : 'btn btn-primary'}
      onClick={handleToggleVelocityAlerts}
      disabled={savingVelocitySettings}
    >
      {savingVelocitySettings ? 'Saving…' : velocityAlertsEnabled ? 'Disable pace alerts' : 'Enable pace alerts'}
    </button>
  </div>
)}

          </section>
        )}
      </main>

           <BottomNavBar items={TABS} activeId={activeTab} onChange={setActiveTab} />
    </div>
  );
}

export default App;