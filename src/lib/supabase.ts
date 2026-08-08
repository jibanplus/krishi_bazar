import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://brwhvuhjmcmqsnjjrjaf.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyd2h2dWhqbWNtcXNuampyamFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2ODIxMTcsImV4cCI6MjEwMTI1ODExN30.OdXlNT_WdRk4SkIZE6O-3kQ5XdNQe5l0TrRB4E0vwA8';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || FALLBACK_URL;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || FALLBACK_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Product = {
  id: string;
  name: string;
  name_en: string | null;
  image_url: string;
  category: string;
  current_price: number;
  unit: string;
};

export type Commodity = {
  id: string;
  name: string;
  name_en: string | null;
  image_url: string;
  category: string;
  current_price: number;
  previous_price: number;
  unit: string;
  change: number;
  change_percent: number;
  is_active: boolean;
  sort_order: number;
  daily_high: number | null;
  daily_low: number | null;
  daily_changes: number;
  avg_movement: number;
  last_analytics_reset: string;
  created_at: string;
};

export type PriceHistory = {
  id: string;
  commodity_id: string;
  price: number;
  recorded_at: string;
};

export type HighRiskAsset = {
  id: string;
  name: string;
  symbol: string | null;
  image_url: string | null;
  current_price: number;
  min_price: number;
  max_price: number;
  volatility_percentage: number;
  change: number;
  change_percent: number;
  risk_level: string;
  potential_return: string | null;
  is_active: boolean;
  sort_order: number;
  daily_high: number | null;
  daily_low: number | null;
  daily_changes: number;
  avg_movement: number;
  last_analytics_reset: string;
  created_at: string;
};

export type Profile = {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  role: string;
  kyc_status: string;
  referral_code: string;
  referred_by: string | null;
  is_online: boolean;
  last_seen: string;
  balance: number;
  bonus_balance: number;
  referral_earnings: number;
  total_referrals: number;
  is_blocked: boolean;
  signup_bonus_credited: boolean;
  created_at: string;
};

export type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  bonus: number;
  referral_income: number;
  total_deposit: number;
  total_withdraw: number;
  wagering_required: number;
  wagering_completed: number;
  bonus_wagering_locked: number;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  reference: string | null;
  created_at: string;
};

export type Referral = {
  id: string;
  referrer_id: string;
  referred_id: string;
  code: string;
  earnings: number;
  status: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export type KycDocument = {
  id: string;
  user_id: string;
  doc_type: string;
  doc_url: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
};

export type Banner = {
  id: string;
  title: string | null;
  image_url: string;
  link: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  action: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export type Deposit = {
  id: string;
  user_id: string;
  amount: number;
  utr: string;
  upi_id: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  confirmed_at: string | null;
};

export type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  upi_id: string | null;
  account_holder: string | null;
  account_number: string | null;
  bank_ifsc: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  confirmed_at: string | null;
};

export type AdminSettings = {
  id: string;
  signup_bonus: number;
  referral_bonus: number;
  referred_bonus: number;
  referrer_reward_pct: number;
  milestone_threshold: number;
  milestone_bonus: number;
  min_deposit: number;
  min_withdraw: number;
  maintenance_mode: boolean;
  qr_code_url: string | null;
  upi_id: string | null;
  price_update_interval: number;
  updated_at: string;
};

export type Holding = {
  id: string;
  user_id: string;
  commodity_id: string;
  quantity: number;
  avg_buy_price: number;
  created_at: string;
  updated_at: string;
};

export type AntiCheatFlag = {
  id: string;
  user_id: string;
  flag_type: string;
  details: string;
  severity: string;
  resolved: boolean;
  reason: string | null;
  created_at: string;
};

export type Product = Commodity;
