function registerModelContext({ $, game, isBusy, startRound, swing, cashOut }) {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  const definitions = [
    {
      name: 'read_game_state', description: 'Read visible demo state, difficulty and revealed baseball symbols. Pending outcomes are not exposed.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true },
      execute: () => ({ ...game.snapshot(), busy: isBusy() })
    },
    {
      name: 'start_demo_round', description: 'Set bet and Easy/Medium/Hard difficulty, then start a virtual-credit round.',
      inputSchema: { type: 'object', properties: { betCredits: { type: 'number', minimum: 1, maximum: 1000 }, difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] } }, required: ['betCredits', 'difficulty'], additionalProperties: false },
      execute: input => {
        if (!input || typeof input.betCredits !== 'number' || !Number.isFinite(input.betCredits) || input.betCredits < 1 || input.betCredits > 1000 || Math.abs(Math.round(input.betCredits * 100) - input.betCredits * 100) > 1e-7 || !MinesEngine.balance.difficulties.includes(input.difficulty) || game.status === 'playing' || isBusy()) throw Error('Invalid round settings or round already active');
        game.setDifficulty(input.difficulty); $('bet').value = String(input.betCredits); return startRound();
      }
    },
    {
      name: 'select_pitch_zone', description: 'Select an unrevealed zone and return its baseball symbol result after the pitch.',
      inputSchema: { type: 'object', properties: { row: { type: 'integer', minimum: 1, maximum: 5 }, column: { type: 'integer', minimum: 1, maximum: 5 } }, required: ['row', 'column'], additionalProperties: false },
      execute: async input => {
        if (!input || !Number.isInteger(input.row) || input.row < 1 || input.row > 5 || !Number.isInteger(input.column) || input.column < 1 || input.column > 5) throw Error('Invalid zone');
        return swing((input.row - 1) * 5 + input.column - 1);
      }
    },
    { name: 'cash_out_demo_round', description: 'Credit the current payout after at least one successful hit.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: () => cashOut() }
  ];
  for (const tool of definitions) {
    try { Promise.resolve(context.registerTool({ ...tool, annotations: { readOnlyHint: false, untrustedContentHint: false, ...tool.annotations } }, { signal: lifecycle.signal })).catch(() => {}); } catch {}
  }
}
