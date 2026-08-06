const AppError = require('./AppError');

const CATEGORY_KEYWORDS = [
  ['coffee', 'Food & Drink'], ['lunch', 'Food & Drink'], ['dinner', 'Food & Drink'],
  ['breakfast', 'Food & Drink'], ['restaurant', 'Food & Drink'], ['takeaway', 'Food & Drink'],
  ['kota', 'Food & Drink'], ['snack', 'Food & Drink'],
  ['grocery', 'Groceries'], ['groceries', 'Groceries'], ['supermarket', 'Groceries'],
  ['uber', 'Transport'], ['taxi', 'Transport'], ['bus', 'Transport'], ['fuel', 'Transport'],
  ['petrol', 'Transport'], ['diesel', 'Transport'], ['transport', 'Transport'], ['fare', 'Transport'],
  ['data', 'Airtime & Data'], ['airtime', 'Airtime & Data'], ['bundles', 'Airtime & Data'],
  ['rent', 'Rent'],
  ['electricity', 'Utilities'], ['water', 'Utilities'], ['wifi', 'Utilities'],
  ['internet', 'Utilities'], ['dstv', 'Utilities'], ['munic', 'Utilities'],
  ['netflix', 'Entertainment'], ['movie', 'Entertainment'], ['cinema', 'Entertainment'],
  ['games', 'Entertainment'], ['spotify', 'Entertainment'], ['outing', 'Entertainment'],
  ['clothes', 'Shopping'], ['shopping', 'Shopping'], ['shoes', 'Shopping'],
  ['medicine', 'Health'], ['clinic', 'Health'], ['pharmacy', 'Health'], ['doctor', 'Health'],
  ['school', 'Education'], ['tuition', 'Education'], ['books', 'Education'], ['fees', 'Education'],
  ['salary', 'Salary'], ['freelance', 'Freelance'], ['gig', 'Freelance'], ['job', 'Salary'],
  ['gift', 'Gift'], ['loan', 'Loan'],
].sort((a, b) => b[0].length - a[0].length);

function autoMapCategory(description) {
  const lower = description.toLowerCase();
  for (const [keyword, category] of CATEGORY_KEYWORDS) {
    if (new RegExp(`\\b${keyword}\\b`).test(lower)) return category;
  }
  return description
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function titleCase(str) {
  return str.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function parseCommand(raw) {
  const command = raw.trim();
  if (!command) {
    throw new AppError('Type a command first — try "-50 lunch" or "+1500 salary"', 400);
  }

  const tokens = command.split(/\s+/);
  const first = tokens[0].toLowerCase();

  if (['balance', 'bal', 'available'].includes(first) && tokens.length === 1) {
    return { type: 'balance' };
  }

  if (first === 'goal') {
    if (tokens.length < 2) {
      throw new AppError('Try: "goal new laptop-fund 5000" or "goal laptop-fund +500"', 400);
    }

    if (tokens[1].toLowerCase() === 'new') {
      const rest = tokens.slice(2);
      const amountToken = rest[rest.length - 1];
      const amount = parseFloat(amountToken);
      if (isNaN(amount) || amount <= 0) {
        throw new AppError('New goals need a target amount, e.g. "goal new laptop-fund 5000"', 400);
      }
      const nameTokens = rest.slice(0, -1);
      if (nameTokens.length === 0) {
        throw new AppError('Give the goal a name, e.g. "goal new laptop-fund 5000"', 400);
      }
      return { type: 'goal_create', title: titleCase(nameTokens.join(' ').replace(/-/g, ' ')), targetAmount: amount };
    }

    const rest = tokens.slice(1);
    const amountIndex = rest.findIndex((t) => /^[+-]\d+(\.\d+)?$/.test(t));
    if (amountIndex === -1) {
      throw new AppError('Say how much to add, e.g. "goal laptop-fund +500"', 400);
    }
    const amountToken = rest[amountIndex];
    if (amountToken[0] === '-') {
      throw new AppError('You can only add money to a goal here, not remove it', 400);
    }
    const amount = parseFloat(amountToken.slice(1));

    const nameTokens = rest.filter((t, i) => i !== amountIndex && !/^\d+(\.\d+)?$/.test(t));
    if (nameTokens.length === 0) {
      throw new AppError('Which goal? e.g. "goal laptop-fund +500"', 400);
    }
    return { type: 'goal_contribute', query: nameTokens.join(' ').replace(/-/g, ' '), amount };
  }

  if (first === 'circle') {
    const rest = tokens.slice(1);
    const amountIndex = rest.findIndex((t) => /^\+\d+(\.\d+)?$/.test(t));
    if (amountIndex === -1) {
      throw new AppError('Say how much to contribute, e.g. "circle family-savings +200"', 400);
    }
    const amount = parseFloat(rest[amountIndex].slice(1));
    const nameTokens = rest.filter((t, i) => i !== amountIndex);
    if (nameTokens.length === 0) {
      throw new AppError('Which circle? e.g. "circle family-savings +200"', 400);
    }
    return { type: 'circle_contribute', query: nameTokens.join(' ').replace(/-/g, ' '), amount };
  }

  if (/^[+-]\d+(\.\d+)?$/.test(first)) {
    const sign = first[0];
    const amount = parseFloat(first.slice(1));
    if (amount <= 0) {
      throw new AppError('Amount must be greater than zero', 400);
    }

    let words = tokens.slice(1);
    let goalTag = null;
    const tagIndex = words.findIndex((w) => w.startsWith('@'));
    if (tagIndex !== -1) {
      goalTag = words[tagIndex].slice(1).replace(/-/g, ' ');
      words = words.filter((w, i) => i !== tagIndex);
    }
    const description = words.join(' ').trim();

    if (sign === '-') {
      if (!description) {
        throw new AppError('Expenses need a short description, e.g. "-50 lunch"', 400);
      }
      return { type: 'expense', amount, category: autoMapCategory(description) };
    }

    return {
      type: 'income',
      amount,
      category: description ? autoMapCategory(description) : null,
      goalQuery: goalTag,
    };
  }

  throw new AppError(
    `Couldn't understand "${command}". Try "-50 lunch", "+1500 salary", or "goal laptop-fund +500"`,
    400
  );
}

module.exports = { parseCommand, autoMapCategory };