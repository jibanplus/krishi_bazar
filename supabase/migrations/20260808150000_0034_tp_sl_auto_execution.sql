-- 0034: Auto-execution function for TP/SL
-- Automatically closes positions when price hits TP or SL levels

CREATE OR REPLACE FUNCTION public.check_tp_sl_execution()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pos record;
  v_current_price numeric;
  v_should_close boolean := false;
  v_close_reason text;
BEGIN
  -- This function would be called by an external service that monitors prices
  -- For now, it's a placeholder for the logic
  
  FOR v_pos IN 
    SELECT id, user_id, symbol, side, entry_price, tp_price, sl_price, amount, leverage, margin
    FROM public.perp_positions
    WHERE status = 'open' 
    AND (tp_price IS NOT NULL OR sl_price IS NOT NULL)
  LOOP
    -- The actual price check would be done by the monitoring service
    -- This function would be called with the current market price
    
    -- Logic: if current_price >= tp_price for long, or <= tp_price for short -> execute TP
    -- Logic: if current_price <= sl_price for long, or >= sl_price for short -> execute SL
    
    -- For now, this is a placeholder
  END LOOP;
END;
$$;

-- Create a function that can be called with a specific price
CREATE OR REPLACE FUNCTION public.execute_tp_sl_for_position(
  p_position_id uuid,
  p_current_price numeric
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pos record;
  v_should_close boolean := false;
  v_close_reason text;
  v_result jsonb;
BEGIN
  SELECT * INTO v_pos FROM public.perp_positions
    WHERE id=p_position_id AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Position not found or already closed'); END IF;
  
  -- Check TP
  IF v_pos.tp_price IS NOT NULL THEN
    IF v_pos.side = 'buy' AND p_current_price >= v_pos.tp_price THEN
      v_should_close := true;
      v_close_reason := 'TP';
    ELSIF v_pos.side = 'sell' AND p_current_price <= v_pos.tp_price THEN
      v_should_close := true;
      v_close_reason := 'TP';
    END IF;
  END IF;
  
  -- Check SL
  IF NOT v_should_close AND v_pos.sl_price IS NOT NULL THEN
    IF v_pos.side = 'buy' AND p_current_price <= v_pos.sl_price THEN
      v_should_close := true;
      v_close_reason := 'SL';
    ELSIF v_pos.side = 'sell' AND p_current_price >= v_pos.sl_price THEN
      v_should_close := true;
      v_close_reason := 'SL';
    END IF;
  END IF;
  
  IF v_should_close THEN
    -- Execute close
    SELECT * INTO v_result FROM public.close_perp_position(p_position_id, p_current_price);
    
    -- Update execution timestamp
    IF v_close_reason = 'TP' THEN
      UPDATE public.perp_positions SET tp_executed_at = now() WHERE id = p_position_id;
    ELSIF v_close_reason = 'SL' THEN
      UPDATE public.perp_positions SET sl_executed_at = now() WHERE id = p_position_id;
    END IF;
    
    RETURN jsonb_build_object('success',true,'closed',true,'reason',v_close_reason,'close_result',v_result);
  ELSE
    RETURN jsonb_build_object('success',true,'closed',false,'reason','No TP/SL hit');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_tp_sl_for_position(uuid,numeric) TO authenticated;