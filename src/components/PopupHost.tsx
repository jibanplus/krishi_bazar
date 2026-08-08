import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, ArrowDownCircle, ArrowUpCircle, ArrowDownLeft, ArrowUpRight, Gift, Award, X, Info, AlertCircle } from 'lucide-react';

type PopupKind =
  | 'buy'
  | 'sell'
  | 'deposit'
  | 'withdraw'
  | 'referral'
  | 'signup_bonus'
  | 'coupon_bonus'
  | 'wagering_complete'
  | 'info'
  | 'error';

type PopupDetail = {
  kind: PopupKind;
  amount?: number;
  fee?: number;
  finalAmount?: number;
  charge?: number;
  message?: string;
  productName?: string;
  qty?: number;
};

const formatINR = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const KIND_CONFIG: Record<
  PopupKind,
  { icon: typeof CheckCircle2; title: string; accent: string; ring: string }
> = {
  buy: {
    icon: ArrowDownLeft,
    title: 'কেনা সফল / Buy Successful',
    accent: 'from-emerald-500 to-green-600',
    ring: 'ring-emerald-400/40',
  },
  sell: {
    icon: ArrowUpRight,
    title: 'বিক্রি সফল / Sell Successful',
    accent: 'from-emerald-500 to-green-600',
    ring: 'ring-emerald-400/40',
  },
  deposit: {
    icon: ArrowDownCircle,
    title: 'ডিপোজিট সফল / Deposit Successful',
    accent: 'from-emerald-500 to-teal-600',
    ring: 'ring-emerald-400/40',
  },
  withdraw: {
    icon: ArrowUpCircle,
    title: 'উইথড্র অনুরোধ / Withdrawal Request Submitted',
    accent: 'from-amber-500 to-orange-600',
    ring: 'ring-amber-400/40',
  },
  referral: {
    icon: Gift,
    title: 'রেফারেল রিওয়ার্ড / Referral Reward Received',
    accent: 'from-fuchsia-500 to-pink-600',
    ring: 'ring-fuchsia-400/40',
  },
  signup_bonus: {
    icon: Award,
    title: 'স্বাগত বোনাস / Welcome Bonus Received',
    accent: 'from-violet-500 to-indigo-600',
    ring: 'ring-violet-400/40',
  },
  coupon_bonus: {
    icon: Award,
    title: 'কুপন বোনাস / Coupon Bonus Received',
    accent: 'from-purple-500 to-pink-600',
    ring: 'ring-purple-400/40',
  },
  wagering_complete: {
    icon: Award,
    title: 'ওয়েজারিং সম্পন / Wagering Complete',
    accent: 'from-yellow-500 to-amber-600',
    ring: 'ring-yellow-400/40',
  },
  info: {
    icon: Info,
    title: 'তথ্য / Info',
    accent: 'from-slate-500 to-slate-700',
    ring: 'ring-slate-400/40',
  },
  error: {
    icon: AlertCircle,
    title: 'ত্রুটি / Error',
    accent: 'from-rose-500 to-red-600',
    ring: 'ring-rose-400/40',
  },
};

export function showPopup(detail: PopupDetail) {
  window.dispatchEvent(new CustomEvent('app:popup', { detail }));
}

export function PopupHost() {
  const [queue, setQueue] = useState<(PopupDetail & { id: number })[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PopupDetail>).detail;
      setQueue((q) => [...q, { ...detail, id: Date.now() + Math.random() }]);
    };
    window.addEventListener('app:popup', handler);
    return () => window.removeEventListener('app:popup', handler);
  }, []);

  const dismiss = useCallback((id: number) => {
    setQueue((q) => q.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    if (queue.length === 0) return;
    const timers = queue.map((p) => setTimeout(() => dismiss(p.id), 4500));
    return () => timers.forEach(clearTimeout);
  }, [queue, dismiss]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 pointer-events-none">
      {queue.map((p) => {
        const cfg = KIND_CONFIG[p.kind];
        const Icon = cfg.icon;
        return (
          <div
            key={p.id}
            className={`pointer-events-auto w-[340px] max-w-[92vw] rounded-2xl bg-white shadow-2xl ring-2 ${cfg.ring} overflow-hidden animate-popup-in`}
          >
            <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.accent}`} />
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 rounded-xl bg-gradient-to-br ${cfg.accent} p-2.5 text-white shadow-lg animate-popup-icon`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{cfg.title}</p>
                  {p.amount != null && (
                    <p className="mt-0.5 text-2xl font-extrabold text-slate-900 animate-popup-amount">
                      {formatINR(p.amount)}
                    </p>
                  )}
                  {p.fee && p.fee > 0 && (
                    <p className="mt-0.5 text-xs text-amber-600 font-semibold">
                      চার্জ (0.5%): -{formatINR(p.fee)}
                    </p>
                  )}
                  {p.finalAmount != null && (
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">
                      {p.kind === 'buy' ? 'মোট কর্ত' : 'প্রাপ্ত মোট'}: {formatINR(p.finalAmount)}
                    </p>
                  )}
                  {p.productName && (
                    <p className="mt-0.5 text-sm text-slate-600">
                      {p.qty != null ? `${p.qty} × ` : ''}
                      {p.productName}
                    </p>
                  )}
                  {p.message && <p className="mt-0.5 text-sm text-slate-600">{p.message}</p>}
                </div>
                <button
                  onClick={() => dismiss(p.id)}
                  className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-0.5 w-full bg-slate-100">
              <div className={`h-full bg-gradient-to-r ${cfg.accent} animate-popup-bar`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
