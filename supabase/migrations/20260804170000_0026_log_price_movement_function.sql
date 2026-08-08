-- Function to log price movements
CREATE OR REPLACE FUNCTION log_price_movement(
  p_product_id UUID,
  p_product_type TEXT,
  p_old_price NUMERIC,
  p_new_price NUMERIC,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_volatility_percentage NUMERIC DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_movement_percent NUMERIC;
  v_movement_type TEXT;
BEGIN
  -- Calculate movement percentage
  IF p_old_price > 0 THEN
    v_movement_percent := ((p_new_price - p_old_price) / p_old_price) * 100;
  ELSE
    v_movement_percent := 0;
  END IF;

  -- Determine movement type
  IF v_movement_percent > 0 THEN
    v_movement_type := 'up';
  ELSE
    v_movement_type := 'down';
  END IF;

  -- Insert into log
  INSERT INTO price_movement_log (
    product_id,
    product_type,
    old_price,
    new_price,
    movement_percent,
    movement_type,
    min_price,
    max_price,
    volatility_percentage
  ) VALUES (
    p_product_id,
    p_product_type,
    p_old_price,
    p_new_price,
    ABS(v_movement_percent),
    v_movement_type,
    p_min_price,
    p_max_price,
    p_volatility_percentage
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_price_movement TO authenticated;
GRANT EXECUTE ON FUNCTION log_price_movement TO anon;

-- Add comment
COMMENT ON FUNCTION log_price_movement IS 'Logs price movements for commodities and crypto assets';
