-- 2-Level Referral Commission System
-- Level 1: 2% commission on successful withdrawal
-- Level 2: 1% commission on successful withdrawal

-- Create commission tracking table
CREATE TABLE IF NOT EXISTS referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  withdrawal_id UUID NOT NULL REFERENCES withdrawals(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (1, 2)),
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  withdrawal_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'reversed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_referrer ON referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_commission_referred ON referral_commissions(referred_id);
CREATE INDEX IF NOT EXISTS idx_commission_withdrawal ON referral_commissions(withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_commission_status ON referral_commissions(status);

-- Function to calculate and award 2-level referral commissions
CREATE OR REPLACE FUNCTION award_referral_commission(p_withdrawal_id UUID, p_amount DECIMAL, p_user_id UUID)
RETURNS TABLE (
  level1_commission DECIMAL,
  level2_commission DECIMAL,
  level1_referrer_id UUID,
  level2_referrer_id UUID
) AS $$
DECLARE
  level1_referrer UUID;
  level2_referrer UUID;
  user_referrer UUID;
  v_level1_rate DECIMAL := 0.02; -- 2%
  v_level2_rate DECIMAL := 0.01; -- 1%
  v_level1_commission DECIMAL := 0;
  v_level2_commission DECIMAL := 0;
BEGIN
  -- Get direct referrer (Level 1)
  SELECT referrer_id INTO user_referrer
  FROM referrals
  WHERE referred_id = p_user_id AND status IN ('active', 'rewarded')
  LIMIT 1;
  
  IF user_referrer IS NOT NULL THEN
    level1_referrer := user_referrer;
    v_level1_commission := p_amount * v_level1_rate;
    
    -- Insert Level 1 commission
    INSERT INTO referral_commissions (
      referrer_id, referred_id, withdrawal_id, level, 
      commission_amount, withdrawal_amount, commission_rate, status
    ) VALUES (
      level1_referrer, p_user_id, p_withdrawal_id, 1,
      v_level1_commission, p_amount, v_level1_rate, 'pending'
    );
    
    -- Get Level 2 referrer (referrer of the referrer)
    SELECT referrer_id INTO level2_referrer
    FROM referrals
    WHERE referred_id = level1_referrer AND status IN ('active', 'rewarded')
    LIMIT 1;
    
    IF level2_referrer IS NOT NULL THEN
      v_level2_commission := p_amount * v_level2_rate;
      
      -- Insert Level 2 commission
      INSERT INTO referral_commissions (
        referrer_id, referred_id, withdrawal_id, level,
        commission_amount, withdrawal_amount, commission_rate, status
      ) VALUES (
        level2_referrer, level1_referrer, p_withdrawal_id, 2,
        v_level2_commission, p_amount, v_level2_rate, 'pending'
      );
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_level1_commission, v_level2_commission, level1_referrer, level2_referrer;
END;
$$ LANGUAGE plpgsql;

-- Function to credit pending commissions to wallet
CREATE OR REPLACE FUNCTION credit_pending_commissions()
RETURNS INTEGER AS $$
DECLARE
  credited_count INTEGER := 0;
BEGIN
  -- Credit all pending commissions
  WITH credited AS (
    UPDATE referral_commissions rc
    SET status = 'credited',
        updated_at = NOW()
    WHERE status = 'pending'
    RETURNING id, referrer_id, commission_amount
  )
  INSERT INTO wallet_adjustments (user_id, amount, direction, reason, balance_after, admin_id)
  SELECT 
    c.referrer_id,
    c.commission_amount,
    'credit',
    'Level ' || rc.level || ' referral commission from withdrawal #' || rc.withdrawal_id,
    (SELECT COALESCE(balance, 0) + c.commission_amount FROM wallets WHERE user_id = c.referrer_id),
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
  FROM credited c
  JOIN referral_commissions rc ON c.id = rc.id;
  
  -- Update wallet balances
  UPDATE wallets w
  SET balance = balance + c.total_commission
  FROM (
    SELECT referrer_id, SUM(commission_amount) as total_commission
    FROM referral_commissions
    WHERE status = 'credited'
    GROUP BY referrer_id
  ) c
  WHERE w.user_id = c.referrer_id;
  
  GET DIAGNOSTICS credited_count = ROW_COUNT;
  RETURN credited_count;
END;
$$ LANGUAGE plpgsql;

-- Function to reverse commissions when withdrawal is rejected/reverted
CREATE OR REPLACE FUNCTION reverse_commission(p_withdrawal_id UUID)
RETURNS INTEGER AS $$
DECLARE
  reversed_count INTEGER := 0;
BEGIN
  -- Reverse all commissions for this withdrawal
  WITH reversed AS (
    UPDATE referral_commissions
    SET status = 'reversed',
        updated_at = NOW()
    WHERE withdrawal_id = p_withdrawal_id AND status = 'credited'
    RETURNING id, referrer_id, commission_amount
  )
  INSERT INTO wallet_adjustments (user_id, amount, direction, reason, balance_after, admin_id)
  SELECT 
    r.referrer_id,
    r.commission_amount,
    'debit',
    'Reversed commission from rejected withdrawal #' || p_withdrawal_id,
    (SELECT COALESCE(balance, 0) - r.commission_amount FROM wallets WHERE user_id = r.referrer_id),
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
  FROM reversed r;
  
  -- Update wallet balances
  UPDATE wallets w
  SET balance = balance - r.total_reversed
  FROM (
    SELECT referrer_id, SUM(commission_amount) as total_reversed
    FROM referral_commissions
    WHERE withdrawal_id = p_withdrawal_id AND status = 'reversed'
    GROUP BY referrer_id
  ) r
  WHERE w.user_id = r.referrer_id;
  
  GET DIAGNOSTICS reversed_count = ROW_COUNT;
  RETURN reversed_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically award commissions on successful withdrawal
CREATE OR REPLACE FUNCTION trigger_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' AND OLD.status != 'success' THEN
    PERFORM award_referral_commission(NEW.id, NEW.amount, NEW.user_id);
    PERFORM credit_pending_commissions();
  ELSIF NEW.status IN ('rejected', 'cancelled') AND OLD.status NOT IN ('rejected', 'cancelled') THEN
    PERFORM reverse_commission(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_referral_commission ON withdrawals;
CREATE TRIGGER trigger_referral_commission
AFTER UPDATE ON withdrawals
FOR EACH ROW
EXECUTE FUNCTION trigger_referral_commission();

-- Add commission tracking to activity logs
CREATE OR REPLACE FUNCTION log_commission_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
    VALUES (
      NEW.referrer_id,
      'commission_earned',
      'Level ' || NEW.level || ' commission: ₹' || NEW.commission_amount || ' from withdrawal #' || NEW.withdrawal_id,
      NULL,
      NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
    VALUES (
      NEW.referrer_id,
      'commission_' || NEW.status,
      'Commission status changed to ' || NEW.status || ' for withdrawal #' || NEW.withdrawal_id,
      NULL,
      NULL
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_commission_activity ON referral_commissions;
CREATE TRIGGER trigger_commission_activity
AFTER INSERT OR UPDATE ON referral_commissions
FOR EACH ROW
EXECUTE FUNCTION log_commission_activity();

-- RLS policies
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own commissions"
ON referral_commissions FOR SELECT
USING (referrer_id = auth.uid());

CREATE POLICY "Admins can view all commissions"
ON referral_commissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);