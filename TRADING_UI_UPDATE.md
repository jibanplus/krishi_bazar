# Trading UI update v5

- Market page remains the trading terminal. No extra Trading navbar/tab.
- Long and Short are side-by-side.
- Buy and Sell execution buttons are both visible and side-by-side.
- Notional and Margin are removed from the visible order panel; backend still calculates them for risk/settlement.
- Mobile layout keeps chart, order book and trade controls close together; order book can be collapsed.
- Coin strip shows the actual terminal coin symbol + live price + 24h change and updates from the same ticker source as the chart.
- Old commodity labels/cards are not used by the terminal market page.
- Coin list uses colorful coin badges and theme-aware text.
- App import fixed to `import MarketPage from '@/pages/MarketPage'` so the previous Vite export error is resolved.
