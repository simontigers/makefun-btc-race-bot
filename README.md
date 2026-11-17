# makefun-btc-race-bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/simontigers/makefun-btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/simontigers/makefun-btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

Entry for [make.fun](https://make.fun) competition `btc-race-24h-20261117-0603`: race a BTC trading bot live for 24 hours.

## Strategy

Long-only, one-round-trip-max trend bot trading cbBTC/USDC on 1-minute bars:

- Wait for 24 bars of history, then buy the full cash balance the first time
  the close is above both its fast EMA (24 bars) and its slow EMA (120 bars).
- Hold unless the position falls to 98% of its cost (2% disaster stop), then
  sell everything and never re-enter.
- If still flat with one hour left (batch 1380), buy if the short-term trend
  is not down; with 20 minutes left (batch 1420), buy anyway so the entry
  always makes at least one trade.

No re-entry keeps fees low: a full-size round trip costs about 26 bps. On the
dev window every faster, multi-trade rule lost money to whipsaw (the kit's
EMA 8/21 baseline: -$106 on 68 trades; buy-and-hold: +$1.07; 24-bar momentum:
+$2.45). This bot's local dev grade: **net PnL +$2.11, 1 trade, max drawdown
2.12%**, guardrails met, two executions reproduced byte for byte.

## Layout

- `main.ts` — the bot, speaking `agent-fun/bars-replay/v1` via the shim
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's TypeScript SDK shim
- `.makefun/owner.json` — links the repo to the make.fun wallet that enters it
- `LICENSE` — MIT

## Run it

```sh
node cli/makefun.mjs grade-local --kit . --bot <path-to-this-repo> --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=eed6w17h&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
