(function (root) {
  'use strict';
  const balance = typeof module !== 'undefined' && module.exports ? require('./tiger-balance.js') : root.TigerBalance;
  const symbolById = Object.fromEntries(balance.symbols.map(symbol => [symbol.id, symbol]));
  function randomInt(max) {
    if (!Number.isInteger(max) || max < 1 || max > 4294967296) throw Error('Invalid random range');
    const limit = 4294967296 - (4294967296 % max), bytes = new Uint32Array(1);
    do { globalThis.crypto.getRandomValues(bytes); } while (bytes[0] >= limit);
    return bytes[0] % max;
  }
  function drawSymbol(weights, random) {
    const ticket = random(10000);
    if (!Number.isInteger(ticket) || ticket < 0 || ticket >= 10000) throw Error('Random number error');
    let upper = 0;
    for (let i = 0; i < weights.length; i++) {
      upper += weights[i];
      if (ticket < upper) return balance.symbols[i].id;
    }
    throw Error('Invalid probability table');
  }
  function shouldAutoCashOut(numerator, denominator, hitCount) {
    return hitCount === balance.cells || numerator > BigInt(balance.threshold) * denominator;
  }
  class MinesGame {
    #numerator = 1n;
    #denominator = 1n;
    #pending = null;
    #board = Array(balance.cells).fill(null);
    #difficulty = 'easy';
    #rtpVersion;
    constructor(random = randomInt, { rtpVersion = balance.activeVersion } = {}) {
      if (!balance.initial[rtpVersion]) throw Error('Choose a supported RTP version.');
      this.random = random; this.#rtpVersion = rtpVersion;
      this.balance = 100000; this.bet = 10000; this.status = 'ready';
      this.hits = new Set(); this.lastPayout = 0; this.triggered = null; this.completionReason = null;
    }
    get difficulty() { return this.#difficulty; }
    get rtpVersion() { return this.#rtpVersion; }
    setDifficulty(value) {
      if (this.status === 'playing') throw Error('Difficulty is locked during a round.');
      if (!balance.difficulties.includes(value)) throw Error('Choose Easy, Medium or Hard.');
      this.#difficulty = value;
    }
    prepare() {
      if (this.status === 'playing') throw Error('Finish the current round first.');
      this.status = 'ready'; this.hits.clear(); this.#board.fill(null); this.#pending = null;
      this.#numerator = 1n; this.#denominator = 1n;
      this.lastPayout = 0; this.triggered = null; this.completionReason = null;
      return this.snapshot();
    }
    start(bet, difficulty = this.#difficulty) {
      if (this.status === 'playing') throw Error('Finish the current round first.');
      // Existing POC credit limits are retained; this migration changes difficulty/symbol math.
      if (!Number.isSafeInteger(bet) || bet < 100 || bet > 100000) throw Error('Enter a bet from 1 to 1,000 CR.');
      if (bet > this.balance) throw Error('Not enough credits. Lower your bet or reset your balance.');
      if (!balance.difficulties.includes(difficulty)) throw Error('Choose Easy, Medium or Hard.');
      this.prepare(); this.#difficulty = difficulty; this.bet = bet; this.balance -= bet; this.status = 'playing';
      return this.snapshot();
    }
    #validateCell(index) {
      if (this.status !== 'playing') throw Error('Step up to the plate first.');
      if (!Number.isInteger(index) || index < 0 || index >= balance.cells) throw Error('Select a valid zone.');
      if (this.#board[index] !== null) throw Error('This zone has already been played.');
      if (this.#pending && this.#pending.index !== index) throw Error('A swing is already in progress.');
    }
    reserve(index) {
      this.#validateCell(index);
      // Draw once on selection so the pitch animation can show HIT/miss correctly.
      // Keep the reserved result private until contact, including in snapshot().
      if (!this.#pending) {
        const weights = this.hits.size === 0 ? balance.initial[this.#rtpVersion][this.#difficulty] : balance.secondary[this.#difficulty];
        this.#pending = { index, symbol: drawSymbol(weights, this.random) };
      }
      return this.#pending.symbol;
    }
    #completedBoard(board) {
      return board.map(symbol => symbol === null ? drawSymbol(balance.secondary[this.#difficulty], this.random) : symbol);
    }
    #payout(numerator = this.#numerator, denominator = this.#denominator) {
      return Number(BigInt(this.bet) * numerator / denominator);
    }
    reveal(index) {
      const symbol = this.reserve(index), board = this.#board.slice();
      board[index] = symbol;
      if (symbol === 'out') {
        const completed = this.#completedBoard(board);
        this.#board = completed; this.#pending = null; this.triggered = index; this.lastPayout = 0; this.status = 'out';
        return 'out';
      }
      const numerator = this.#numerator * BigInt(symbolById[symbol].factor), denominator = this.#denominator * 100n;
      const automatic = shouldAutoCashOut(numerator, denominator, this.hits.size + 1);
      const completed = automatic ? this.#completedBoard(board) : board;
      this.#numerator = numerator; this.#denominator = denominator;
      this.#board = completed; this.#pending = null; this.hits.add(index);
      if (automatic) {
        this.lastPayout = this.#payout(); this.balance += this.lastPayout; this.status = 'cleared';
        this.completionReason = this.hits.size === balance.cells ? 'board' : 'threshold';
        return 'cleared';
      }
      return 'hit';
    }
    cashout() {
      if (this.status !== 'playing' || this.hits.size === 0) throw Error('Land at least one hit before cashing out.');
      if (this.#pending) throw Error('Wait for the current swing to finish.');
      const completed = this.#completedBoard(this.#board);
      this.lastPayout = this.#payout(); this.balance += this.lastPayout;
      this.#board = completed; this.status = 'cashed';
      return this.lastPayout;
    }
    reset() {
      if (this.status === 'playing') throw Error('Finish the round before resetting.');
      this.prepare(); this.balance = 100000;
      return this.snapshot();
    }
    snapshot() {
      const active = this.status === 'playing', multiplier = this.status === 'out' ? 0 : Number(this.#numerator) / Number(this.#denominator);
      return {
        status: this.status, balance: this.balance, bet: this.bet, difficulty: this.#difficulty,
        rtpVersion: this.#rtpVersion, rtp: balance.rtp[this.#rtpVersion], hits: [...this.hits], board: this.#board.slice(),
        multiplier, displayMultiplier: this.status === 'out' ? 0 : Number(this.#numerator * 100n / this.#denominator) / 100,
        cashout: active ? this.hits.size ? this.#payout() : 0 : this.lastPayout,
        successProbability: 1 - balance.secondary[this.#difficulty][0] / 10000,
        playedCells: this.hits.size + (this.triggered === null ? 0 : 1),
        remainingCells: this.#board.filter(symbol => symbol === null).length,
        completionReason: this.completionReason
      };
    }
  }
  const api = { MinesGame, balance, symbolById, drawSymbol, shouldAutoCashOut, randomInt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MinesEngine = api;
})(globalThis);
