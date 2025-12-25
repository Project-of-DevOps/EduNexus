const counters = {};

module.exports = {
  inc: (name, amount = 1) => {
    counters[name] = (counters[name] || 0) + amount;
  },
  get: (name) => counters[name] || 0,
  dump: () => ({ ...counters }),
};
