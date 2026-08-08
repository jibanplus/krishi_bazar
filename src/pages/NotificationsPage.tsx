import { useEffect, useState } from 'react';
import { Bell, Check, BellOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase, type Notification } from '@/lib/supabase';

export function NotificationsPage() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('created_at', { ascending: false });
      setNotifications(data || []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`notifs-${session.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  async function markAllRead() {
    if (!session) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>নোটিফিকেশন</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>রিয়েল-টাইম আপডেট ও বিজ্ঞপ্তি</p>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button onClick={markAllRead} className="btn-outline text-sm">সব পঠিত করুন</button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 w-full" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <BellOff className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>কোনো নোটিফিকেশন নেই</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`card p-4 flex items-start gap-3 ${!n.is_read ? 'border-brand-500/30' : ''}`}>
              <div className={`p-2 rounded-lg flex-shrink-0 ${n.type === 'deposit' || n.type === 'referral' || n.type === 'bonus' ? 'bg-brand-500/10' : n.type === 'withdraw' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                <Bell className={`w-4 h-4 ${n.type === 'deposit' || n.type === 'referral' || n.type === 'bonus' ? 'text-brand-500' : n.type === 'withdraw' ? 'text-red-500' : 'text-blue-500'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />}
                </div>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.is_read && (
                <button onClick={() => markRead(n.id)} className="p-2 rounded-lg hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }}>
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
