-- 0032: Admin-controlled trading terminal coin price ranges
CREATE TABLE IF NOT EXISTS public.trading_terminal_coin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  min_price numeric(30,12) NOT NULL CHECK (min_price > 0),
  max_price numeric(30,12) NOT NULL CHECK (max_price > min_price),
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trading_terminal_coin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "terminal_ranges_public_read" ON public.trading_terminal_coin_settings;
CREATE POLICY "terminal_ranges_public_read"
  ON public.trading_terminal_coin_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "terminal_ranges_admin_write" ON public.trading_terminal_coin_settings;
CREATE POLICY "terminal_ranges_admin_write"
  ON public.trading_terminal_coin_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.trading_terminal_coin_settings TO anon, authenticated;
GRANT ALL ON public.trading_terminal_coin_settings TO service_role;

INSERT INTO public.trading_terminal_coin_settings (symbol,name,min_price,max_price,sort_order)
VALUES
('BTC/USDT','Bitcoin',60000,75000,1),
('ETH/USDT','Ethereum',3000,4000,2),
('SOL/USDT','Solana',130,210,3),
('BNB/USDT','BNB',500,680,4),
('XRP/USDT','XRP',0.45,0.85,5),
('ADA/USDT','Cardano',0.30,0.60,6),
('DOGE/USDT','Dogecoin',0.08,0.18,7),
('AVAX/USDT','Avalanche',20,40,8)
ON CONFLICT (symbol) DO UPDATE SET
  name=excluded.name,
  min_price=excluded.min_price,
  max_price=excluded.max_price,
  sort_order=excluded.sort_order,
  updated_at=now();
