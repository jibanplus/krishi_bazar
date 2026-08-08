import { useEffect, useState } from 'react';
import { Loader2, Inbox, Send, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AdminLayout } from '@/components/AdminLayout';

type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  admin_response: string | null;
  created_at: string;
};

type UserInfo = { id: string; username: string; email: string };

const categoryLabels: Record<string, string> = {
  deposit: 'ডিপোজিট', withdraw: 'উইথড্র', trade: 'ট্রেড', wallet: 'ওয়ালেট',
  referral: 'রেফারেল', bonus: 'বোনাস', account: 'অ্যাকাউন্ট', market: 'মার্কেট', other: 'অন্যান্য',
};

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
const priorityStyles: Record<string, string> = {
  low: 'bg-blue-500/10 text-blue-500',
  medium: 'bg-amber-500/10 text-amber-500',
  high: 'bg-orange-500/10 text-orange-500',
  urgent: 'bg-red-500/10 text-red-500',
};
const priorityLabels: Record<string, string> = { low: 'কম', medium: 'মাঝারি', high: 'উচ্চ', urgent: 'জরুরি' };

const statusStyles: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-500',
  in_progress: 'bg-amber-500/10 text-amber-500',
  resolved: 'bg-emerald-500/10 text-emerald-500',
  closed: 'bg-gray-500/10 text-gray-500',
};
const statusLabels: Record<string, string> = { open: 'খোলা', in_progress: 'চলমান', resolved: 'সমাধান', closed: 'বন্ধ' };

export function AdminSupportTickets() {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    const list = (data as Ticket[]) || [];
    list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    setTickets(list);

    // Load user info
    const ids = Array.from(new Set(list.map((t) => t.user_id)));
    if (ids.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, username, email').in('id', ids);
      const map: Record<string, UserInfo> = {};
      (profs || []).forEach((p) => (map[p.id] = p));
      setUsers(map);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: Ticket['status']) {
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'resolved' || status === 'closed') updates.resolved_at = new Date().toISOString();
    await supabase.from('support_tickets').update(updates).eq('id', id);
    load();
  }

  async function sendReply(id: string) {
    const reply = (replies[id] || '').trim();
    if (!reply) return;
    setSaving(id);
    const { error } = await supabase
      .from('support_tickets')
      .update({
        admin_response: reply,
        status: 'resolved',
        admin_id: session?.user.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    setSaving(null);
    if (!error) {
      setReplies((prev) => ({ ...prev, [id]: '' }));
      load();
    }
  }

  const filtered = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);
  const pendingCount = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>সমস্যা রিপোর্ট (Tickets)</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            ব্যবহারকারীদের রিপোর্ট দেখুন ও উত্তর দিন
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" /> {pendingCount} টি pending
          </span>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-4 py-1.5 rounded-lg font-semibold transition ${
              filter === f ? 'bg-brand-500 text-white' : 'bg-white/5 border border-white/10'
            }`}
            style={filter === f ? {} : { color: 'var(--text-secondary)' }}
          >
            {f === 'all' ? `সব (${tickets.length})` : statusLabels[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>কোনো রিপোর্ট নেই</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((t) => {
            const user = users[t.user_id];
            return (
              <div key={t.id} className="card p-5 space-y-4">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{t.subject}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {user?.username || 'Unknown'} • {user?.email || ''} • {new Date(t.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityStyles[t.priority]}`}>
                      {priorityLabels[t.priority]}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[t.status]}`}>
                      {statusLabels[t.status]}
                    </span>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                    {categoryLabels[t.category] || t.category}
                  </span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Ticket #{t.id.slice(0, 8)}</span>
                </div>

                {/* Description */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>
                </div>

                {/* Existing response */}
                {t.admin_response && (
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-500">আপনার উত্তর</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{t.admin_response}</p>
                  </div>
                )}

                {/* Reply + Status */}
                <div className="space-y-3">
                  <textarea
                    value={replies[t.id] ?? ''}
                    onChange={(e) => setReplies((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder="উত্তর লিখুন..."
                    className="input-field min-h-[80px] resize-none"
                    rows={3}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => sendReply(t.id)}
                      disabled={saving === t.id || !(replies[t.id] || '').trim()}
                      className="btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      উত্তর পাঠান ও সমাধান করুন
                    </button>
                    <select
                      value={t.status}
                      onChange={(e) => updateStatus(t.id, e.target.value as Ticket['status'])}
                      className="input-field w-auto text-sm py-2"
                    >
                      <option value="open">খোলা</option>
                      <option value="in_progress">চলমান</option>
                      <option value="resolved">সমাধান</option>
                      <option value="closed">বন্ধ</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}