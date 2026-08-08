import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Search, ChevronDown, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
};

// Fallback - যদি database এ FAQ না থাকে
const defaultFaqs: FaqItem[] = [
  { id: 'd1', question: 'কীভাবে অ্যাকাউন্ট খুলবো?', answer: 'হোম পেজে "নিবন্ধন করুন" বাটনে ক্লিক করে আপনার ইমেইল, ফোন নম্বর এবং পাসওয়ার্ড দিয়ে সহজেই অ্যাকাউন্ট খুলতে পারবেন। সাইনআপ বোনাস পাবেন সাথে সাথে!', category: 'account', sort_order: 1 },
  { id: 'd2', question: 'ডিপোজিট করতে কত সময় লাগে?', answer: 'UPI, ব্যাংক ট্রান্সফার বা ক্রিপ্টো দিয়ে ডিপোজিট করলে সাধারণত ৫-৩০ মিনিটের মধ্যে অ্যাডমিন দ্বারা অনুমোদিত হয়ে আপনার ওয়ালেটে যোগ হয়।', category: 'deposit', sort_order: 2 },
  { id: 'd3', question: 'উইথড্র কীভাবে করবো?', answer: 'ওয়ালেট পেজ থেকে "উইথড্র" বাটনে ক্লিক করুন। আপনার ব্যাংক/UPI বিবরণ দিন এবং পরিমাণ লিখুন। অ্যাডমিন অনুমোদনের পর ২৪ ঘণ্টার মধ্যে টাকা পৌঁছে যাবে।', category: 'withdraw', sort_order: 3 },
  { id: 'd4', question: 'রেফারেল বোনাস কীভাবে পাবো?', answer: 'আপনার রেফারেল লিংক বন্ধুদের শেয়ার করুন। তারা সাইনআপ করে প্রথম ডিপোজিট করলে আপনি এবং আপনার বন্ধু উভয়েই বোনাস পাবেন। লেভেল 1 এবং লেভেল 2 কমিশন আছে!', category: 'referral', sort_order: 4 },
  { id: 'd5', question: 'বোনাস উত্তোলন করতে কী করতে হবে?', answer: 'বোনাস থেকে উইথড্র করতে আপনাকে 20x ওয়েজারিং সম্পন্ন করতে হবে। অর্থাৎ বোনাসের ২০ গুণ পরিমাণের ট্রেড সম্পন্ন করতে হবে।', category: 'bonus', sort_order: 5 },
  { id: 'd6', question: 'চার্জ কত?', answer: 'প্রতিটি ট্রেডে 0.5% চার্জ প্রযোজ্য। এই চার্জ অটোমেটিক্যালি কাটা হয় - বাই-এ যোগ হয় এবং সেল-এ বিয়োগ হয়।', category: 'trade', sort_order: 6 },
  { id: 'd7', question: 'মার্কেট কখন বন্ধ থাকে?', answer: 'কৃষি বাজার সপ্তাহে ৭ দিন ২৪ ঘণ্টা চালু থাকে। শুধুমাত্র মেইনটেনেন্স মোডে সাময়িকভাবে বন্ধ হতে পারে।', category: 'market', sort_order: 7 },
  { id: 'd8', question: 'আমার অ্যাকাউন্ট ব্লক হয়েছে কেন?', answer: 'প্রতারণামূলক কার্যকলাপ, একাধিক অ্যাকাউন্ট, বা নিয়ম লঙ্ঘনের কারণে অ্যাকাউন্ট ব্লক হতে পারে। সাপোর্ট টিমের সাথে যোগাযোগ করুন।', category: 'account', sort_order: 8 },
];

const categoryLabels: Record<string, string> = {
  account: 'অ্যাকাউন্ট',
  deposit: 'ডিপোজিট',
  withdraw: 'উইথড্র',
  trade: 'ট্রেড',
  referral: 'রেফারেল',
  bonus: 'বোনাস',
  market: 'মার্কেট',
  general: 'সাধারণ',
};

export function SupportFaqPage() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('faq_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setFaqs(data && data.length > 0 ? (data as FaqItem[]) : defaultFaqs);
      setLoading(false);
    }
    load();
  }, []);

  const categories = ['all', ...Array.from(new Set(faqs.map((f) => f.category)))];

  const filtered = faqs.filter((f) => {
    const matchSearch =
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === 'all' || f.category === activeCategory;
    return matchSearch && matchCategory;
  });

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/support')} className="p-2 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <HelpCircle className="w-6 h-6 text-blue-500" />
            সাধারণ প্রশ্নোত্তর (FAQ)
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            আপনার প্রশ্নের উত্তর খুঁজে নিন
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="প্রশ্ন খুঁজুন..."
          className="input-field pl-10"
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition ${
              activeCategory === cat
                ? 'bg-brand-500 text-white'
                : 'bg-white/5 border border-white/10'
            }`}
            style={activeCategory === cat ? {} : { color: 'var(--text-secondary)' }}
          >
            {cat === 'all' ? 'সব' : categoryLabels[cat] || cat}
          </button>
        ))}
      </div>

      {/* FAQ List */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>কোনো প্রশ্ন পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id} className="card overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <HelpCircle className="w-4 h-4 text-blue-500" />
                    </span>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pl-15">
                    <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 ml-11">
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CTA */}
      <div className="card p-6 mt-8 text-center">
        <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
          উত্তর খুঁজে পাননি?
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          আমাদের টিম সরাসরি সাহায্য করবে
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate('/support/chat')} className="btn-primary px-6 py-2.5 flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" /> লাইভ চ্যাট
          </button>
          <button onClick={() => navigate('/support/report')} className="px-6 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 font-semibold flex items-center justify-center gap-2 hover:bg-amber-500/20 transition">
            <AlertCircle className="w-4 h-4" /> সমস্যা রিপোর্ট
          </button>
        </div>
      </div>
    </div>
  );
}