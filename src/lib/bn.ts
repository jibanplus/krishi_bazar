export function bnNum(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '০';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '০';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toLocaleString('en-IN', { maximumFractionDigits: 2 }).replace(/[0-9]/g, (d) => bnDigits[parseInt(d)]);
}

export function bnMoney(n: number | string | null | undefined): string {
  return '₹' + bnNum(n);
}

export function bnDate(iso: string): string {
  const d = new Date(iso);
  const bnMonths = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে'];
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const conv = (s: string | number) => String(s).replace(/[0-9]/g, (d) => bnDigits[parseInt(d)]);
  return `${conv(d.getDate())} ${bnMonths[d.getMonth()]} ${conv(d.getFullYear())}, ${conv(d.getHours().toString().padStart(2, '0'))}:${conv(d.getMinutes().toString().padStart(2, '0'))}`;
}

export function timeAgoBn(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return bnNum(day) + ' দিন আগে';
  if (hr > 0) return bnNum(hr) + ' ঘন্টা আগে';
  if (min > 0) return bnNum(min) + ' মিনিট আগে';
  return 'এইমাত্র';
}
