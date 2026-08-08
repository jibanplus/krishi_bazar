import type { Order, Position, Side, Ticker } from '@/modules/trading-terminal/types';

export type TradingState = {
  balance: number;
  orders: Order[];
  positions: Position[];
  tradeHistory: { id: string; symbol: string; side: Side; price: number; amount: number; total: number; time: number }[];
};

export const INITIAL_BALANCE = 100000;

export function createInitialState(balance = INITIAL_BALANCE): TradingState {
  return {
    balance,
    orders: [],
    positions: [],
    tradeHistory: [],
  };
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function calcLiquidation(entryPrice: number, leverage: number, side: Side): number {
  const maintenance = 0.005;
  if (side === 'buy') {
    return entryPrice * (1 - 1 / leverage + maintenance);
  }
  return entryPrice * (1 + 1 / leverage - maintenance);
}

export function calcPnl(
  side: Side,
  entryPrice: number,
  currentPrice: number,
  amount: number,
  leverage: number
): { pnl: number; pnlPercent: number } {
  const diff = side === 'buy' ? currentPrice - entryPrice : entryPrice - currentPrice;
  const pnl = diff * amount;
  const margin = (entryPrice * amount) / leverage;
  const pnlPercent = margin > 0 ? (pnl / margin) * 100 : 0;
  return { pnl, pnlPercent };
}

export function matchLimitOrder(
  order: Order,
  currentPrice: number
): { filled: boolean; fillPrice: number } {
  if (order.side === 'buy' && currentPrice <= order.price) {
    return { filled: true, fillPrice: order.price };
  }
  if (order.side === 'sell' && currentPrice >= order.price) {
    return { filled: true, fillPrice: order.price };
  }
  return { filled: false, fillPrice: 0 };
}

export function openPosition(
  state: TradingState,
  params: {
    symbol: string;
    side: Side;
    price: number;
    amount: number;
    leverage: number;
  }
): { state: TradingState; position: Position; error?: string } {
  const margin = (params.price * params.amount) / params.leverage;
  if (margin > state.balance) {
    return { state, position: {} as Position, error: 'Insufficient balance for margin' };
  }
  const position: Position = {
    id: uid(),
    symbol: params.symbol,
    side: params.side,
    entryPrice: params.price,
    amount: params.amount,
    leverage: params.leverage,
    liquidationPrice: calcLiquidation(params.price, params.leverage, params.side),
    currentPrice: params.price,
    pnl: 0,
    pnlPercent: 0,
    margin,
    status: 'open',
    openedAt: Date.now(),
  };
  return {
    state: { ...state, balance: state.balance - margin, positions: [position, ...state.positions] },
    position,
  };
}

export function closePosition(
  state: TradingState,
  positionId: string,
  closePrice: number
): { state: TradingState; error?: string } {
  const position = state.positions.find((p) => p.id === positionId);
  if (!position || position.status !== 'open') {
    return { state, error: 'Position not found or already closed' };
  }
  const { pnl } = calcPnl(position.side, position.entryPrice, closePrice, position.amount, position.leverage);
  const closed: Position = {
    ...position,
    status: 'closed',
    currentPrice: closePrice,
    pnl,
    pnlPercent: (pnl / position.margin) * 100,
    closedAt: Date.now(),
  };
  return {
    state: {
      ...state,
      balance: state.balance + position.margin + pnl,
      positions: state.positions.map((p) => (p.id === positionId ? closed : p)),
    },
  };
}

export function updatePositions(state: TradingState, prices: Record<string, number>): TradingState {
  const positions = state.positions.map((p) => {
    if (p.status !== 'open') return p;
    const currentPrice = prices[p.symbol] ?? p.currentPrice;
    const { pnl, pnlPercent } = calcPnl(p.side, p.entryPrice, currentPrice, p.amount, p.leverage);
    return { ...p, currentPrice, pnl, pnlPercent };
  });
  return { ...state, positions };
}

export function checkLiquidations(
  state: TradingState,
  prices: Record<string, number>
): { state: TradingState; liquidated: Position[] } {
  const liquidated: Position[] = [];
  let balance = state.balance;
  const positions = state.positions.map((p) => {
    if (p.status !== 'open') return p;
    const currentPrice = prices[p.symbol] ?? p.currentPrice;
    const isLiquidated =
      (p.side === 'buy' && currentPrice <= p.liquidationPrice) ||
      (p.side === 'sell' && currentPrice >= p.liquidationPrice);
    if (isLiquidated) {
      const { pnl } = calcPnl(p.side, p.entryPrice, currentPrice, p.amount, p.leverage);
      const remaining = Math.max(0, p.margin + pnl);
      balance += remaining;
      const closed: Position = {
        ...p,
        status: 'closed',
        currentPrice,
        pnl: pnl,
        pnlPercent: (pnl / p.margin) * 100,
        closedAt: Date.now(),
      };
      liquidated.push(closed);
      return closed;
    }
    return p;
  });
  return { state: { ...state, balance, positions }, liquidated };
}

export function checkPendingOrders(
  state: TradingState,
  prices: Record<string, number>
): { state: TradingState; filled: Order[] } {
  const filled: Order[] = [];
  const remaining: Order[] = [];
  let balance = state.balance;

  for (const order of state.orders) {
    if (order.status !== 'open' && order.status !== 'pending') {
      remaining.push(order);
      continue;
    }
    const currentPrice = prices[order.symbol];
    if (currentPrice === undefined) {
      remaining.push(order);
      continue;
    }
    const result = matchLimitOrder(order, currentPrice);
    if (result.filled) {
      const filledOrder: Order = {
        ...order,
        status: 'filled',
        filledAt: Date.now(),
      };
      filled.push(filledOrder);
      // For limit orders we treat them as spot fills: adjust balance
      if (order.side === 'buy') {
        balance -= order.total;
      } else {
        balance += order.total;
      }
    } else {
      remaining.push(order);
    }
  }

  return { state: { ...state, orders: remaining, balance }, filled };
}

export function createSpotOrder(
  state: TradingState,
  params: {
    symbol: string;
    side: Side;
    type: 'market' | 'limit';
    price: number;
    amount: number;
  }
): { state: TradingState; order: Order; error?: string } {
  const total = params.price * params.amount;
  if (params.side === 'buy' && total > state.balance) {
    return { state, order: {} as Order, error: 'Insufficient balance' };
  }
  const order: Order = {
    id: uid(),
    symbol: params.symbol,
    side: params.side,
    type: params.type,
    price: params.price,
    amount: params.amount,
    total,
    status: params.type === 'market' ? 'filled' : 'open',
    createdAt: Date.now(),
    filledAt: params.type === 'market' ? Date.now() : undefined,
  };

  let newBalance = state.balance;
  if (params.type === 'market') {
    if (params.side === 'buy') newBalance -= total;
    else newBalance += total;
  }

  const tradeRecord = {
    id: order.id,
    symbol: params.symbol,
    side: params.side,
    price: params.price,
    amount: params.amount,
    total,
    time: Date.now(),
  };

  return {
    state: {
      ...state,
      balance: newBalance,
      orders: params.type === 'limit' ? [order, ...state.orders] : state.orders,
      tradeHistory: [tradeRecord, ...state.tradeHistory].slice(0, 100),
    },
    order,
  };
}

export function cancelOrder(state: TradingState, orderId: string): TradingState {
  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId && (o.status === 'open' || o.status === 'pending')
        ? { ...o, status: 'cancelled' as const }
        : o
    ),
  };
}

export function getTickerFromConfig(config: { symbol: string; name: string; basePrice: number }, currentPrice: number, sparkline: number[]): Ticker {
  const open = sparkline[0] ?? currentPrice;
  const change = currentPrice - open;
  const changePercent = open > 0 ? (change / open) * 100 : 0;
  const high24h = Math.max(...sparkline, currentPrice);
  const low24h = Math.min(...sparkline, currentPrice);
  const volume24h = currentPrice * 1000 * (1 + Math.random());
  return {
    symbol: config.symbol,
    name: config.name,
    price: currentPrice,
    change,
    changePercent,
    high24h,
    low24h,
    volume24h,
    sparkline,
  };
}
