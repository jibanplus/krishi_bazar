-- Crypto Index Volatility System Migration
-- Add volatility settings for high-risk crypto assets

-- Add volatility_percentage column to high_risk_assets
ALTER TABLE high_risk_assets
ADD COLUMN IF NOT EXISTS volatility_percentage DECIMAL(5,2) DEFAULT 20;

-- Create function to simulate high volatility crypto price movements
CREATE OR REPLACE FUNCTION simulate_crypto_volatility(
  p_asset_id UUID,
  p_current_price DECIMAL(15,2),
  p_min_price DECIMAL(15,2),
  p_max_price DECIMAL(15,2),
  p_volatility_percentage DECIMAL(5,2)
)
RETURNS TABLE(new_price DECIMAL(15,2), multiplier DECIMAL(5,2))
LANGUAGE plpgsql
AS $$
DECLARE
  v_multiplier DECIMAL(5,2);
  v_new_price DECIMAL(15,2);
  v_direction INTEGER;
  v_fluctuation DECIMAL(5,2);
BEGIN
  -- Random direction (1 = up, -1 = down)
  v_direction := CASE WHEN RANDOM() > 0.5 THEN 1 ELSE -1 END;
  
  -- Calculate fluctuation based on volatility percentage
  -- High volatility can result in 2x, 5x, 10x movements
  v_fluctuation := (RANDOM() * (p_volatility_percentage / 100)) + 0.01;
  
  -- Apply rare high multiplier events (10% chance)
  IF RANDOM() < 0.1 THEN
    -- 2x, 5x, or 10x movement
    v_multiplier := CASE 
      WHEN RANDOM() < 0.33 THEN 2.0
      WHEN RANDOM() < 0.66 THEN 5.0
      ELSE 10.0
    END;
    v_fluctuation := v_fluctuation * v_multiplier;
  END IF;
  
  -- Calculate new price
  v_new_price := p_current_price * (1 + (v_direction * v_fluctuation));
  
  -- Ensure price stays within min/max bounds
  v_new_price := GREATEST(p_min_price, LEAST(p_max_price, v_new_price));
  
  -- Calculate actual multiplier achieved
  v_multiplier := ABS(v_new_price / p_current_price);
  
  RETURN QUERY SELECT v_new_price, v_multiplier;
END;
$$;

-- Create function to update crypto prices with volatility
CREATE OR REPLACE FUNCTION update_crypto_prices_with_volatility()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset RECORD;
  v_price_data RECORD;
BEGIN
  FOR v_asset IN 
    SELECT id, current_price, min_price, max_price, volatility_percentage
    FROM high_risk_assets
    WHERE is_active = true
  LOOP
    -- Simulate volatility
    SELECT * INTO v_price_data 
    FROM simulate_crypto_volatility(
      v_asset.id,
      v_asset.current_price,
      v_asset.min_price,
      v_asset.max_price,
      COALESCE(v_asset.volatility_percentage, 20)
    );
    
    -- Update price
    UPDATE high_risk_assets SET
      current_price = v_price_data.new_price,
      change = v_price_data.new_price - v_asset.current_price,
      change_percent = ((v_price_data.new_price - v_asset.current_price) / v_asset.current_price) * 100,
      risk_level = CASE 
        WHEN v_price_data.multiplier >= 5 THEN 'EXTREME'
        WHEN v_price_data.multiplier >= 2 THEN 'HIGH'
        WHEN v_price_data.multiplier >= 1.5 THEN 'MEDIUM'
        ELSE 'LOW'
      END,
      potential_return = CASE 
        WHEN v_price_data.multiplier >= 5 THEN '10x Possible'
        WHEN v_price_data.multiplier >= 2 THEN '5x Possible'
        WHEN v_price_data.multiplier >= 1.5 THEN '2x Possible'
        ELSE 'High Reward'
      END
    WHERE id = v_asset.id;
  END LOOP;
END;
$$;