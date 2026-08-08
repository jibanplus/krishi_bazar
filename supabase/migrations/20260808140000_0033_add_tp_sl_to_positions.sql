-- 0033: Add TP/SL columns to perp_positions table
-- Allows users to set Take Profit and Stop Loss for their positions

ALTER TABLE public.perp_positions 
ADD COLUMN IF NOT EXISTS tp_price numeric(20,8),
ADD COLUMN IF NOT EXISTS sl_price numeric(20,8),
ADD COLUMN IF NOT EXISTS tp_executed_at timestamptz,
ADD COLUMN IF NOT EXISTS sl_executed_at timestamptz;

-- Add comments
COMMENT ON COLUMN public.perp_positions.tp_price IS 'Take Profit target price';
COMMENT ON COLUMN public.perp_positions.sl_price IS 'Stop Loss target price';
COMMENT ON COLUMN public.perp_positions.tp_executed_at IS 'Timestamp when TP was executed';
COMMENT ON COLUMN public.perp_positions.sl_executed_at IS 'Timestamp when SL was executed';

-- Create function to update TP/SL for existing positions
CREATE OR REPLACE FUNCTION public.update_position_tp_sl(
  p_position_id uuid,
  p_tp_price numeric DEFAULT NULL,
  p_sl_price numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pos record;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Unauthorized'); END IF;
  
  SELECT * INTO v_pos FROM public.perp_positions
    WHERE id=p_position_id AND user_id=v_uid AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Position not found or already closed'); END IF;
  
  -- Update TP/SL if provided
  IF p_tp_price IS NOT NULL THEN
    UPDATE public.perp_positions SET tp_price = p_tp_price WHERE id = p_position_id;
  END IF;
  
  IF p_sl_price IS NOT NULL THEN
    UPDATE public.perp_positions SET sl_price = p_sl_price WHERE id = p_position_id;
  END IF;
  
  RETURN jsonb_build_object('success',true,'position_id',p_position_id,'tp_price',p_tp_price,'sl_price',p_sl_price);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_position_tp_sl(uuid,numeric,numeric) TO authenticated;