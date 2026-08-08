import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, Sparkles } from 'lucide-react';

type Activity = {
  id: string;
  type: 'deposit' | 'withdraw';
  name: string;
  amount: number;
  time: string;
};

const INDIAN_NAMES = [
  'অমিত কুমার', 'প্রিয়া শর্মা', 'রাহুল সিং', 'স্নেহা রেড্ডি', 'বিক্রম সিং',
  'অঞ্জলি গুপ্তা', 'রাজেশ বর্মা', 'কবিতা নায়র', 'সঞ্জয় জোশি', 'মীনা আইয়ার',
  'দীপক যাদব', 'পূজা কাপুর', 'সুনীল দাস', 'নেহা আগরওয়াল', 'মনোজ কুমার',
  'সুনীতা রাও', 'বিজয় চৌহান', 'রানী মুখার্জি', 'অশোক মেহতা', 'লক্ষ্মী দেবী',
];

function formatTime(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return 'এই মুহূর্তে';
  if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ঘন্টা আগে`;
  return `${Math.floor(diff / 86400)} দিন আগে`;
}

function generateRandomActivity(): Activity {
  const type = Math.random() > 0.5 ? 'deposit' : 'withdraw';
  const name = INDIAN_NAMES[Math.floor(Math.random() * INDIAN_NAMES.length)];
  // Generate realistic amounts (500+ to 20,000)
  const amount = Math.floor(Math.random() * (20000 - 500 + 1)) + 500;
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    name,
    amount,
    time: formatTime(new Date()),
  };
}

export function LiveActivityNotifications() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Start with 3 activities
    const initialActivities = Array.from({ length: 3 }, generateRandomActivity);
    setActivities(initialActivities);
    setVisible(true);

    // Add new activity every 8-15 seconds
    const interval = setInterval(() => {
      const newActivity = generateRandomActivity();
      setActivities(prev => [newActivity, ...prev].slice(0, 5));
    }, Math.random() * 7000 + 8000);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-brand-500/10 to-gold-400/10 border border-brand-500/20">
        <Sparkles className="w-4 h-4 text-brand-500 animate-pulse" />
        <span className="text-xs font-semibold text-brand-500">লাইভ অ্যাক্টিভিটি</span>
      </div>

      {activities.slice(0, 3).map((activity, index) => (
        <div
          key={activity.id}
          className="card p-3 flex items-center gap-3 animate-slide-up"
          style={{
            animationDelay: `${index * 100}ms`,
            maxWidth: '320px',
          }}
        >
          <div className={`p-2 rounded-lg ${
            activity.type === 'deposit' 
              ? 'bg-emerald-500/10 text-emerald-500' 
              : 'bg-rose-500/10 text-rose-500'
          }`}>
            {activity.type === 'deposit' ? (
              <ArrowDownLeft className="w-4 h-4" />
            ) : (
              <ArrowUpRight className="w-4 h-4" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {activity.name}
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className={`font-semibold ${
                activity.type === 'deposit' ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {activity.type === 'deposit' ? '+' : '-'}₹{activity.amount.toLocaleString()}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {activity.time}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}