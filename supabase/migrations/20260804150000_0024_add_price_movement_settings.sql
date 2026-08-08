-- Add price movement settings to commodities table
ALTER TABLE commodities 
ADD COLUMN IF NOT EXISTS min_price NUMERIC,
ADD COLUMN IF NOT EXISTS max_price NUMERIC,
ADD COLUMN IF NOT EXISTS movement_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS volatility_percentage NUMERIC;

-- Add movement_percentage to high_risk_assets table
ALTER TABLE high_risk_assets 
ADD COLUMN IF NOT EXISTS movement_percentage NUMERIC;

-- Add comments
COMMENT ON COLUMN commodities.min_price IS 'Minimum price for movement range';
COMMENT ON COLUMN commodities.max_price IS 'Maximum price for movement range';
COMMENT ON COLUMN commodities.movement_percentage IS 'Movement percentage per update (e.g., 2.5 means 2.5% movement)';
COMMENT ON COLUMN commodities.volatility_percentage IS 'Volatility percentage for price fluctuation';
COMMENT ON COLUMN high_risk_assets.movement_percentage IS 'Movement percentage per update (e.g., 2.5 means 2.5% movement)';
