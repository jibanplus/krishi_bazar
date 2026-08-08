# Compact Trading Terminal Integration

The existing website remains the shell. The `/` Market page is replaced by the compact terminal.
No new Trading navbar/tab was added.

## 1. Install
npm install

## 2. Apply the database migration
Run:
supabase/migrations/20260808120000_0031_perpetual_trading.sql

in the Supabase SQL Editor.

This creates persistent `perp_positions` and atomic RPCs:
- `open_perp_position`
- `close_perp_position`

The existing `wallets.balance` and `profiles.balance` are updated together.

## 3. Run
npm run dev

## Trading behavior
- Wallet balance is read from the existing `wallets` table and updated through Supabase Realtime.
- Opening Long/Short reserves margin + 0.1% fee.
- Live PnL is calculated from entry vs mark price and position size.
- Closing returns remaining margin + realized PnL - close fee.
- Liquidation price is calculated from leverage and side.
- Position history is persisted in `perp_positions`.
- Market prices remain the terminal's live simulated market engine.

Important: this is a simulated/internal trading engine, not a real exchange execution engine.
