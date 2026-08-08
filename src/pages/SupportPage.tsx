import { useNavigate } from 'react-router-dom';
import { MessageCircle, AlertCircle, HelpCircle, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';

export function SupportPage() {
  const navigate = useNavigate();

  const options = [
    {
      title: 'লাইভ চ্যাট',
      description: 'সাপোর্ট টিমের সাথে সরাসরি চ্যাট করুন এবং তৎক্ষণাৎ সাহায্য পান',
      icon: MessageCircle,
      color: 'from-brand-500 to-purple-500',
      bgColor: 'bg-brand-500/10',
      iconColor: 'text-brand-500',
      badge: 'সবচেয়ে দ্রুত',
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      path: '/support/chat',
    },
    {
      title: 'সমস্যা রিপোর্ট',
      description: 'বিস্তারিত সমস্যা লিখে টিকেট জমা দিন, আমরা দ্রুত সমাধান দেব',
      icon: AlertCircle,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      badge: 'ফর্ম ভিত্তিক',
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      path: '/support/report',
    },
    {
      title: 'FAQ',
      description: 'সাধারণ প্রশ্ন ও উত্তর দেখুন, সম্ভবত আপনার প্রশ্নের উত্তর আগেই আছে',
      icon: HelpCircle,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      badge: 'স্ব-সেবা',
      badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      path: '/support/faq',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10 animate-slide-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 mb-4">
          <MessageCircle className="w-4 h-4 text-brand-500" />
          <span className="text-brand-500 font-semibold text-sm">সাপোর্ট সেন্টার</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          আমরা আপনার সেবায় প্রস্তুত
        </h1>
        <p className="text-base max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          আপনার যেকোনো সমস্যা, প্রশ্ন বা পরামর্শের জন্য নিচের যেকোনো একটি মাধ্যম বেছে নিন
        </p>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <div
              key={opt.title}
              onClick={() => navigate(opt.path)}
              className="card p-6 space-y-4 cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden"
            >
              {/* Decorative gradient */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${opt.color} opacity-5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500`} />

              {/* Badge */}
              <div className="flex items-center justify-between">
                <div className={`w-14 h-14 rounded-2xl ${opt.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-7 h-7 ${opt.iconColor}`} />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${opt.badgeColor}`}>
                  {opt.badge}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {opt.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {opt.description}
                </p>
              </div>

              <div className={`flex items-center gap-2 font-semibold text-sm ${opt.iconColor} pt-2`}>
                <span>এখনই শুরু করুন</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Info */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
          কীভাবে সাহায্য পাবেন?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>জরুরি সমস্যা?</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>লাইভ চ্যাট ব্যবহার করুন - ৫ মিনিটে উত্তর</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>জটিল সমস্যা?</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>রিপোর্ট ফর্ম দিয়ে বিস্তারিত লিখুন - ২৪ ঘণ্টায় সমাধান</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>সাধারণ প্রশ্ন?</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>FAQ তে খুঁজুন - তাৎক্ষণিক উত্তর</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}