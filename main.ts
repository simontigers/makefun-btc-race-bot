// BTC race bot for make.fun btc-race-24h-20261117-0603.
//
// Strategy, in one paragraph: a long-only, one-round-trip-max trend bot. It
// waits for 24 one-minute bars of history, then buys the full cash balance the
// first time the close is above both its fast EMA (24 bars) and its slow EMA
// (120 bars) -- both trends pointing up. Once in, it holds unless the position
// falls to 98% of its cost (a 2% disaster stop), in which case it sells
// everything and never re-enters. If it is still flat with one hour left
// (batch 1380), it buys anyway so the entry always makes at least one trade.
// No re-entry keeps fees low: a full-size round trip costs about 26 bps in
// fee, slippage and price impact, and on the dev window every faster,
// multi-trade rule lost money to whipsaw (the kit's EMA 8/21 baseline lost
// $106 on 68 trades; buy-and-hold made $1.07; the 24-bar momentum baseline
// made $2.45).
//
// Protocol: agent-fun/bars-replay/v1. The bot speaks it through the kit's
// TypeScript shim in vendor/makefun-bars.ts: the harness sends hello once,
// then one batch per minute (the bar that just closed, the fills of the
// previous batch's orders, and the account), and this bot answers every batch
// with exactly one reply echoing its seq, carrying its orders. Orders decided
// on a batch fill at the next bar's open, so every decision here uses only
// bars already closed -- no future data. Deterministic: float EMAs only, no
// wall clock, no randomness, no files outside the repository, so the two
// graded executions agree.

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const FAST_SPAN = 24;
const SLOW_SPAN = 120;
/** Sell everything if the position is worth at most this share of its cost. */
const STOP_NUM = 98n;
const STOP_DEN = 100n;
/** With one hour of the 1,440-bar window left, buy anyway if still flat. */
const FALLBACK_BAR = 1380;
const MAX_SLIPPAGE_BPS = 100;

/** One EMA over closes, seeded as the mean of its first span, like the baselines. */
interface Ema {
  span: number;
  warm: number[];
  value: number | null;
}

function step(e: Ema, close: number): void {
  if (e.value !== null) {
    e.value += (2 / (e.span + 1)) * (close - e.value);
    return;
  }
  e.warm.push(close);
  if (e.warm.length === e.span) e.value = e.warm.reduce((a, x) => a + x, 0) / e.span;
}

const fast: Ema = { span: FAST_SPAN, warm: [], value: null };
const slow: Ema = { span: SLOW_SPAN, warm: [], value: null };
let lastClose: number | null = null;
let sold = false;

await runBars({
  onBatch(state: BarsState, batch) {
    for (const bar of batch.bars) {
      if (bar.symbol !== SYMBOL) continue;
      const c = Number(bar.c);
      lastClose = c;
      step(fast, c);
      step(slow, c);
    }
    if (state.warmingUp) return [];
    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      const value = state.value(SYMBOL, held.qty);
      if (value * STOP_DEN <= held.cost * STOP_NUM) {
        sold = true;
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      return [];
    }
    if (sold) return [];
    const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS };
    if (state.seq >= FALLBACK_BAR) return [buy];
    if (fast.value !== null && slow.value !== null && lastClose !== null
      && lastClose > fast.value && lastClose > slow.value) {
      return [buy];
    }
    return [];
  },
});
