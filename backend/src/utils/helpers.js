const crypto = require('crypto');

const generateCode = (length = 8) =>
  crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();

const slugify = (text) =>
  text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

const getRemainingSeconds = (endDate) => {
  const now = Date.now();
  const end = new Date(endDate).getTime();
  return Math.max(0, Math.floor((end - now) / 1000));
};

const toNumber = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

module.exports = { generateCode, slugify, getRemainingSeconds, toNumber, shuffleArray };
