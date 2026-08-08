-- Create price movement log table
CREATE TABLE IF NOT EXISTS price_movement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('commodity', 'crypto')),
  old_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  movement_percent NUMERIC NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('up', 'down')),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  min_price NUMERIC,
  max_price NUMERIC,
  volatility_percentage NUMERIC
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_price_movement_log_product ON price_movement_log(product_id, product_type);
CREATE INDEX IF NOT EXISTS idx_price_movement_log_recorded_at ON price_movement_log(recorded_at DESC);

-- Add comments
COMMENT ON TABLE price_movement_log IS 'Logs all price movements for commodities and crypto assets';
COMMENT ON COLUMN price_movement_log.product_id IS 'ID of the commodity or crypto asset';
COMMENT ON COLUMN price_movement_log.product_type IS 'Type of product (commodity or crypto)';
COMMENT ON COLUMN price_movement_log.old_price IS 'Price before movement';
COMMENT ON COLUMN price_movement_log.new_price IS 'Price after movement';
COMMENT ON COLUMN price_movement_log.movement_percent IS 'Percentage of movement (e.g., 2.5 for 2.5%)';
COMMENT ON COLUMN price_movement_log.movement_type IS 'Direction of movement (up or down)';
COMMENT ON COLUMN price_movement_log.min_price IS 'Minimum price range at time of movement';
COMMENT ON COLUMN price_movement_log.max_price IS 'Maximum price range at time of movement';
COMMENT ON COLUMN price_movement_log.volatility_percentage IS 'Volatility setting at time of movement';
