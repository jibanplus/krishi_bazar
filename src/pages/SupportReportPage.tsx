import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Send, Clock, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Ticket = {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  admin_response?: string;
  created_at: string;
  resolved_at?: string;
};

const categories = [
  { value: 'deposit', label: 'ডিপোজিট সমস্যা' },
  { value: 'withdraw', label: 'উইথড্র সমস্যা' },
  { value: 'trade', label: 'ট্রেড সমস্যা' },
  { value: 'wallet', label: 'ওয়ালেট সমস্যা' },
  { value: 'referral', label: 'রেফারেল সমস্যা' },
  { value: 'bonus', label: 'বোনাস সমস্যা' },
  { value: 'account', label: 'অ্যাকাউন্ট সমস্যা' },
  { value: 'market', label: 'মার্কেট সমস্যা' },
  { value: 'other', label: 'অন্যান্য' },
];

const priorities = [
  { value: 'low', label: 'কম', color: 'text-blue-500 bg-blue-500/10' },
  { value: 'medium', label: 'মাঝারি', color: 'text-amber-500 bg-amber-500/10' },
  { value: 'high', label: 'উচ্চ', color: 'text-orange-500 bg-orange-500/10' },
  { value: 'urgent', label: 'জরুরি', color: 'text-red-500 bg-red-500/10' },
];

const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: 'খোলা', color: 'bg-blue-500/10 text-blue-500' },
  in_progress: { label: 'চলমান', color: 'bg-amber-500/10 text-amber-500' },
  resolved: { label: 'সমাধান হয়েছে', color: 'bg-emerald-500/10 text-emerald-500' },
  closed: { label: 'বন্ধ', color: 'bg-gray-500/10 text-gray-500' },
};

export function SupportReportPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [priority, setPriority] = useState('medium');

  useEffect(() => { loadTickets(); }, [session]);

  async function loadTickets() {
    if (!session) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      alert('অনুগ্রহ করে বিষয় এবং বিবরণ লিখুন');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: session!.user.id,
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
    });
    setSubmitting(false);
    if (error) {
      alert('সমস্যা হয়েছে: ' + error.message);
      return;
    }
    setSubject('');
    setDescription('');
    setCategory('other');
    setPriority('medium');
    setShowForm(false);
    await loadTickets();
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/support')} className="p-2 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <AlertCircle className="w-6 h-6 text-amber-500" />
            সমস্যা রিপোর্ট
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            বিস্তারিত সমস্যা লিখে টিকেট জমা দিন
          </p>
        </div>
      </div>

      {/* New Ticket Button / Form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full card p-4 flex items-center justify-center gap-2 hover:shadow-lg transition-all mb-6"
        >
          <Send className="w-4 h-4 text-brand-500" />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>নতুন রিপোর্ট জমা দিন</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>নতুন রিপোর্ট</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-red-500">বাতিল</button>
          </div>

          <div>
            <label className="text-sm mb-2 block" style={{ color: 'var(--text-secondary)' }}>বিষয় *</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="সংক্ষেপে সমস্যা লিখুন..."
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-2 block" style={{ color: 'var(--text-secondary)' }}>ক্যাটাগরি</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm mb-2 block" style={{ color: 'var(--text-secondary)' }}>প্রাধান্য</label>
              <div className="grid grid-cols-4 gap-2">
                {priorities.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`text-xs py-2 rounded-lg font-semibold transition ${
                      priority === p.value ? p.color : 'bg-white/5'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm mb-2 block" style={{ color: 'var(--text-secondary)' }}>বিস্তারিত বিবরণ *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="সমস্যার পূর্ণ বিবরণ দিন। যতটা সম্ভব বিস্তারিত লিখুন (কখন হয়েছে, কী ঘটেছে, কোন পণ্য/পেজ ইত্যাদি)..."
              className="input-field min-h-[140px] resize-none"
              rows={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !subject.trim() || !description.trim()}
            className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            রিপোর্ট জমা দিন
          </button>
        </form>
      )}

      {/* My Tickets */}
      <div>
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
          আমার রিপোর্টসমূহ ({tickets.length})
        </h2>

        {tickets.length === 0 ? (
          <div className="card p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>এখনো কোনো রিপোর্ট নেই</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const statusInfo = statusLabels[ticket.status];
              const priorityInfo = priorities.find((p) => p.value === ticket.priority);
              return (
                <div key={ticket.id} className="card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                        {ticket.subject}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityInfo?.color}`}>
                          {priorityInfo?.label}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                          {categories.find((c) => c.value === ticket.category)?.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                    {ticket.description}
                  </p>

                  {ticket.admin_response && (
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-500">অ্যাডমিন উত্তর</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                        {ticket.admin_response}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}