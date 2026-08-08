import { useEffect, useState } from 'react';
import { X, Loader2, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { Commodity, HighRiskAsset } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { showPopup } from '@/components/PopupHost';

export type TradeKind = 'commodity' | 'asset';

type Props = {
  product: Commodity | HighRiskAsset | null;
  mode: 'buy' | 'sell' | null;
  kind?: TradeKind;
  onClose: () => void;
  onSuccess?: () => Promise<void> | void;
};

export function TradeModal({ product, mode, kind = 'commodity', onClose, onSuccess }: Props) {
  const { session, refreshProfile } = useAuth();
  const [qty, setQty] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdingQty, setHoldingQty] = useState<number | null>(null);

  const isAsset = kind === 'asset';
  const unitLabel = isAsset ? 'ইউনিট' : '100kg';

  useEffect(() => {
    if (!product) return;

    setQty('1');
    setError(null);

    if (mode !== 'sell') {
      setHoldingQty(null);
      return;
    }

    const userId = session?.user?.id;
    if (!userId) {
      setHoldingQty(0);
      return;
    }

    const query = isAsset
      ? supabase.from('asset_holdings').select('quantity').eq('asset_id', product.id)
      : supabase.from('holdings').select('quantity').eq('commodity_id', product.id);

    query
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setHoldingQty(data ? Number(data.quantity) : 0));
  }, [product, mode, kind, session?.user?.id]);

  if (!product || !mode) return null;

  const quantity = parseFloat(qty) || 0;
  const total = quantity * Number(product.current_price);
  const charge = total * 0.005; // 0.5% charge on all trades
  const isBuy = mode === 'buy';
  // Buy: charge is added on top. Sell: charge is deducted from the payout.
  const finalAmount = isBuy ? total + charge : total - charge;

  async function handleConfirm() {
    if (!product || !mode) return;
    if (!session?.user?.id) {
      setError('অনুগ্রহ করে আগে লগইন করুন');
      return;
    }
    if (quantity <= 0) {
      setError('সঠিক পরিমাণ লিখুন');
      return;
    }
    if (mode === 'sell' && holdingQty !== null && quantity > holdingQty) {
      setError(`আপনার কাছে মাত্র ${holdingQty} ${unitLabel} আছে`);
      return;
    }

    setLoading(true);
    setError(null);

    const fnName = isAsset
      ? isBuy
        ? 'buy_asset'
        : 'sell_asset'
      : isBuy
        ? 'buy_commodity'
        : 'sell_commodity';

    const params = isAsset
      ? { p_asset_id: product.id, p_quantity: quantity }
      : { p_commodity_id: product.id, p_quantity: quantity };

    const { data, error: rpcError } = await supabase.rpc(fnName, params as never);

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    if (data?.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    showPopup({
      kind: isBuy ? 'buy' : 'sell',
      amount: finalAmount,
      fee: charge,
      finalAmount: finalAmount,
      productName: product.name,
      qty: quantity,
    });

    // Refresh profile to sync wallet balance
    if (onSuccess) await onSuccess();
    await refreshProfile?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            {product.image_url && (
              <img src={product.image_url} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
            )}
            <div>
              <h3 className="text-lg font-bold text-white font-bengali">{product.name}</h3>
              <p className="text-xs text-slate-400">
                ₹{Number(product.current_price).toFixed(2)}/{unitLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {holdingQty !== null && mode === 'sell' && (
            <div className="mb-3 rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-slate-300">
              আপনার হোল্ডিং: <span className="font-bold text-white">{holdingQty} {unitLabel}</span>
            </div>
          )}

          <label className="text-sm text-slate-400">পরিমাণ ({unitLabel})</label>
          <input
            type="number"
            min="0"
            step={isAsset ? '0.01' : '0.5'}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-lg text-white outline-none focus:border-emerald-500"
          />

          <div className="mt-4 rounded-xl bg-slate-800/50 p-4">
            <div className="flex justify-between text-sm text-slate-400">
              <span>একক মূল্য</span>
              <span>₹{Number(product.current_price).toFixed(2)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-slate-400">
              <span>পরিমাণ</span>
              <span>{quantity} {unitLabel}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-slate-400">
              <span>মোট</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            {isAsset && (
              <div className="mt-2 flex justify-between text-sm text-amber-400">
                <span>চার্জ (0.5%)</span>
                <span>{isBuy ? '+' : '-'}₹{charge.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-3 border-t border-white/10 pt-3 flex justify-between">
              <span className="font-semibold text-white">{isBuy ? 'মোট প্রদেয়' : 'মোট প্রাপ্য'}</span>
              <span className="text-xl font-bold text-white">₹{finalAmount.toFixed(2)}</span>
            </div>
            {isBuy && (
              <div className="mt-2 text-xs text-slate-500 text-center">
                ওয়ালেট থেকে ₹{finalAmount.toFixed(2)} কেটে যাবে
              </div>
            )}
            {!isBuy && (
              <div className="mt-2 text-xs text-slate-500 text-center">
                ওয়ালেটে ₹{finalAmount.toFixed(2)} যোগ হবে
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={loading || quantity <= 0}
            className={`mt-5 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-base font-bold transition-all active:scale-95 disabled:opacity-50 ${
              isBuy
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-rose-500 text-white hover:bg-rose-400'
            }`}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isBuy ? (
              <ArrowDownLeft className="h-5 w-5" />
            ) : (
              <ArrowUpRight className="h-5 w-5" />
            )}
            {isBuy ? 'কেনা নিশ্চিত করুন' : 'বিক্রি নিশ্চিত করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}