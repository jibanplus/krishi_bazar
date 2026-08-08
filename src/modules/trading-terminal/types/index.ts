export type Side = 'buy' | 'sell';

export type OrderType = 'market' | 'limit';

export type OrderStatus = 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected';

export type PositionStatus = 'open' | 'closed';

export type OrderBookLevel = {
  price: number;
  amount: number;
  total: number;
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Ticker = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  sparkline: number[];
};

export type Trade = {
  id: string;
  symbol: string;
  side: Side;
  price: number;
  amount: number;
  total: number;
  time: number;
<<<<<<< HEAD
  fee?: number;
  feeType?: 'maker' | 'taker';
=======
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
};

export type Order = {
  id: string;
  symbol: string;
  side: Side;
  type: OrderType;
  price: number;
  amount: number;
  total: number;
  status: OrderStatus;
  createdAt: number;
  filledAt?: number;
};

export type Position = {
  id: string;
  symbol: string;
  side: Side;
  entryPrice: number;
  amount: number;
  leverage: number;
  liquidationPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  margin: number;
  status: PositionStatus;
  openedAt: number;
  closedAt?: number;
<<<<<<< HEAD
  openFee?: number;
  closeFee?: number;
  openFeeType?: 'maker' | 'taker';
  closeFeeType?: 'maker' | 'taker';
=======
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
};

export type MarketConfig = {
  symbol: string;
  name: string;
  basePrice: number;
  volatility: number;
  drift: number;
  tickSize: number;
  minAmount: number;
  maxAmount: number;
  minPrice?: number;
  maxPrice?: number;
};
