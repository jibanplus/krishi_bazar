import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, MessageCircle, Loader2, Check, CheckCircle, ArrowLeft, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  read: boolean;
};

type Conversation = {
  id: string;
  user_id: string;
  user_name: string;
  status: string;
  created_at: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

export function SupportChatPage() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!session) return;
    loadConversations();
  }, [session]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      const channel = supabase
        .channel(`chat-${selectedConversation.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
          if (payload.new.conversation_id === selectedConversation.id) {
            setMessages(prev => [...prev, payload.new as Message]);
            scrollToBottom();
          }
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [selectedConversation]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  async function loadConversations() {
    const query = isAdmin
      ? supabase.from('support_conversations').select('*').order('last_message_at', { ascending: false })
      : supabase.from('support_conversations').select('*').eq('user_id', session!.user.id).order('last_message_at', { ascending: false });
    const { data } = await query;
    setConversations(data || []);
    setLoading(false);
  }

  async function loadMessages(conversationId: string) {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  }

  async function createConversation() {
    if (!subject.trim() || !description.trim()) {
      alert('অনুগ্রহ করে বিষয় এবং বিবরণ লিখুন');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .insert({
          user_id: session!.user.id,
          user_name: profile?.username || 'User',
          status: 'open',
          last_message: `${subject}: ${description.substring(0, 50)}...`,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        await supabase.from('support_messages').insert({
          conversation_id: data.id,
          sender_id: session!.user.id,
          sender_name: profile?.username || 'User',
          message: `বিষয়: ${subject}\n\nবিবরণ:\n${description}`,
          is_admin: false,
          read: false,
        });

        setSubject('');
        setDescription('');
        setShowNewChat(false);
        await loadConversations();
        setSelectedConversation(data);
      }
    } catch (err) {
      alert('সমস্যা হয়েছে: ' + (err as Error).message);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation) return;
    setSending(true);
    const { error } = await supabase.from('support_messages').insert({
      conversation_id: selectedConversation.id,
      sender_id: session!.user.id,
      sender_name: profile?.username || (isAdmin ? 'Admin' : 'User'),
      message: newMessage.trim(),
      is_admin: isAdmin,
      read: false,
    });

    if (!error) {
      await supabase
        .from('support_conversations')
        .update({ last_message: newMessage.trim(), last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);
      setNewMessage('');
      await loadConversations();
    }
    setSending(false);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/support')} className="p-2 rounded-lg hover:bg-white/10 transition" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <MessageCircle className="w-6 h-6 text-brand-500" />
            লাইভ চ্যাট
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin ? 'সব ইউজারদের সাথে চ্যাট করুন' : 'আমাদের সাপোর্ট টিমের সাথে চ্যাট করুন'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <div className="card p-4 space-y-4 max-h-[650px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>কথোপকথন</h2>
              {!isAdmin && (
                <button onClick={() => setShowNewChat(true)} className="btn-primary text-xs px-3 py-1.5">
                  + নতুন
                </button>
              )}
            </div>

            {showNewChat && !isAdmin && (
              <div className="p-4 rounded-xl border border-brand-500/30 bg-brand-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>নতুন চ্যাট</h3>
                  <button onClick={() => setShowNewChat(false)} className="p-1 rounded hover:bg-white/10">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="বিষয়..."
                  className="input-field"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="সমস্যার বিবরণ..."
                  className="input-field min-h-[80px] resize-none"
                  rows={3}
                />
                <button
                  onClick={createConversation}
                  disabled={!subject.trim() || !description.trim()}
                  className="btn-primary w-full text-sm disabled:opacity-50"
                >
                  চ্যাট শুরু করুন
                </button>
              </div>
            )}

            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>কোনো কথোপকথন নেই</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    selectedConversation?.id === conv.id
                      ? 'bg-brand-500/10 border border-brand-500/50'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {isAdmin ? conv.user_name : 'সাপোর্ট টিম'}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(conv.last_message_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {conv.last_message || 'কোনো মেসেজ নেই'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      conv.status === 'open' ? 'bg-brand-500/10 text-brand-500' : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {conv.status === 'open' ? 'খোলা' : 'বন্ধ'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <div className="card h-[650px] flex flex-col overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    {isAdmin ? selectedConversation.user_name : 'সাপোর্ট টিম'}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {selectedConversation.status === 'open' ? '● সক্রিয়' : 'বন্ধ'}
                  </p>
                </div>
                <button onClick={() => setSelectedConversation(null)} className="p-2 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>এখনো কোনো মেসেজ নেই</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === session?.user.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[75%] space-y-1">
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-semibold">{msg.sender_name}</span>
                            {msg.is_admin && <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 text-[10px]">Admin</span>}
                          </div>
                          <div
                            className={`rounded-2xl px-4 py-2.5 whitespace-pre-wrap ${
                              isOwn ? 'bg-brand-500 text-white' : 'bg-white/5 text-current border border-white/10'
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                          </div>
                          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isOwn && (msg.read ? <CheckCircle className="w-3 h-3 text-brand-500" /> : <Check className="w-3 h-3" />)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="মেসেজ লিখুন..."
                    className="input-field flex-1"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="btn-primary px-4 py-2 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card h-[650px] flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  কথোপকথন নির্বাচন করুন
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  বাম পাশ থেকে একটি কথোপকথন নির্বাচন করুন অথবা নতুন শুরু করুন
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}