module.exports = function pickWord(words) {
  const today = new Date();
  const index = today.getDate() - 1;
  return words[index] || null;
};