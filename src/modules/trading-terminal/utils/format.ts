<<<<<<< HEAD
export const INR_PER_USDT = 100;

export function toInr(value: number): number {
  return value * INR_PER_USDT;
}

export function fromInr(value: number): number {
  return value / INR_PER_USDT;
}

export function formatPrice(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '0.00';
  return value.toLocaleString('en-IN', {
=======
export function formatPrice(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '0.00';
  return value.toLocaleString('en-US', {
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

<<<<<<< HEAD
export function formatInr(value: number, decimals = 2): string {
  return `₹${formatPrice(toInr(value), decimals)}`;
}

=======
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (value / 1e3).toFixed(2) + 'K';
  return value.toFixed(2);
}

export function formatAmount(value: number, decimals = 4): string {
  if (!Number.isFinite(value)) return '0.0000';
<<<<<<< HEAD
  return value.toLocaleString('en-IN', {
=======
  return value.toLocaleString('en-US', {
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatTime(ts: number): string {
<<<<<<< HEAD
  return new Date(ts).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
=======
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
  });
}

export function formatDateTime(ts: number): string {
<<<<<<< HEAD
  return new Date(ts).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
=======
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
  });
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
