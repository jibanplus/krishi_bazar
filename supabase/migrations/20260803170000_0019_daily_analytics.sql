-- Daily Analytics Migration
-- Add daily high/low, changes count, and average movement tracking

-- Add analytics columns to commodities
ALTER TABLE commodities
ADD COLUMN IF NOT EXISTS daily_high DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS daily_low DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS daily_changes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_movement DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_analytics_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add analytics columns to high_risk_assets
ALTER TABLE high_risk_assets
ADD COLUMN IF NOT EXISTS daily_high DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS daily_low DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS daily_changes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_movement DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_analytics_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to reset daily analytics
CREATE OR REPLACE FUNCTION reset_daily_analytics()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reset commodities
  UPDATE commodities SET
    daily_high = current_price,
    daily_low = current_price,
    daily_changes = 0,
    avg_movement = 0,
    last_analytics_reset = NOW()
  WHERE last_analytics_reset < DATE(NOW());
  
  -- Reset high_risk_assets
  UPDATE high_risk_assets SET
    daily_high = current_price,
    daily_low = current_price,
    daily_changes = 0,
    avg_movement = 0,
    last_analytics_reset = NOW()
  WHERE last_analytics_reset < DATE(NOW());
END;
$$;

-- Create function to update daily analytics on price change
CREATE OR REPLACE FUNCTION update_daily_analytics(
  p_table TEXT,
  p_id UUID,
  p_new_price DECIMAL(15,2),
  p_old_price DECIMAL(15,2)
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_daily_high DECIMAL(15,2);
  v_daily_low DECIMAL(15,2);
  v_daily_changes INTEGER;
  v_avg_movement DECIMAL(5,2);
  v_movement_pct DECIMAL(5,2);
BEGIN
  -- Calculate movement percentage
  IF p_old_price > 0 THEN
    v_movement_pct := ABS((p_new_price - p_old_price) / p_old_price) * 100;
  ELSE
    v_movement_pct := 0;
  END IF;
  
  IF p_table = 'commodities' THEN
    -- Get current analytics
    SELECT daily_high, daily_low, daily_changes, avg_movement
    INTO v_daily_high, v_daily_low, v_daily_changes, v_avg_movement
    FROM commodities WHERE id = p_id;
    
    -- Update analytics
    UPDATE commodities SET
      daily_high = COALESCE(GREATEST(v_daily_high, p_new_price), p_new_price),
      daily_low = COALESCE(LEAST(v_daily_low, p_new_price), p_new_price),
      daily_changes = COALESCE(v_daily_changes, 0) + 1,
      avg_movement = ((COALESCE(v_avg_movement, 0) * COALESCE(v_daily_changes, 0)) + v_movement_pct) / (COALESCE(v_daily_changes, 0) + 1)
    WHERE id = p_id;
    
  ELSIF p_table = 'high_risk_assets' THEN
    -- Get current analytics
    SELECT daily_high, daily_low, daily_changes, avg_movement
    INTO v_daily_high, v_daily_low, v_daily_changes, v_avg_movement
    FROM high_risk_assets WHERE id = p_id;
    
    -- Update analytics
    UPDATE high_risk_assets SET
      daily_high = COALESCE(GREATEST(v_daily_high, p_new_price), p_new_price),
      daily_low = COALESCE(LEAST(v_daily_low, p_new_price), p_new_price),
      daily_changes = COALESCE(v_daily_changes, 0) + 1,
      avg_movement = ((COALESCE(v_avg_movement, 0) * COALESCE(v_daily_changes, 0)) + v_movement_pct) / (COALESCE(v_daily_changes, 0) + 1)
    WHERE id = p_id;
  END IF;
END;
$$;