import { useMemo, useState } from 'react';
import { Search, Users, Radio } from 'lucide-react';
import { useLanguage } from '@/eru/context/LanguageContext';
import SocialFeed from '../components/messages/SocialFeed';
import ChatDirectory from '../components/messages/ChatDirectory';
import ChatRoom from '../components/messages/ChatRoom';
import CreateChatPanel from '../components/messages/CreateChatPanel';
import TradeNegotiationFeed from '../components/messages/TradeNegotiationFeed';
import TradeNegotiationChatRoom from '../components/messages/TradeNegotiationChatRoom';
import { useAuth } from '@/eru/lib/AuthContext';
import { useRealtimeEntityList } from '@/eru/hooks/useLiveSync';

const INITIAL_CHATS = [
  {
    id: 'global',
    name: 'Global Collectors Chat',
    description: 'Open market discussion, portfolio talk, listings, and trade flow.',
    visibility: 'open',
    voice_enabled: false,
    members: ['You', 'Alex', 'Maya', 'TON Whale'],
    messages: [
      { id: 'm1', author: 'Alex', text: 'Who is watching the premium jade listings today?' },
      { id: 'm2', author: 'Maya', text: 'I posted a new trade idea in the feed for rare cards vs TON.' },
    ],
  },
  {
    id: 'friends',
    name: 'Friends Portfolio Room',
    description: 'Invite-only room for trade setups, private notes, and voice chat.',
    visibility: 'private',
    voice_enabled: true,
    members: ['You', 'Alex', 'Maya'],
    messages: [
      { id: 'm3', author: 'You', text: 'Let’s compare our allocation changes before tonight.' },
      { id: 'm4', author: 'Alex', text: 'Voice room is ready if you want to walk through the listings live.' },
    ],
  },
];

export default function Messages() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState('feed');
  const [search, setSearch] = useState('');
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [activeChatId, setActiveChatId] = useState('global');
  const [activeNegotiationChatId, setActiveNegotiationChatId] = useState(null);
  const negotiationEnabled = Boolean(user?.email) && Boolean(window.base44?.entities?.TradeNegotiationChat || true);
  const { data: negotiationChats } = useRealtimeEntityList('TradeNegotiationChat', { sort: '-updated_date', limit: 50, enabled: negotiationEnabled });

  const visibleChats = useMemo(() => chats.filter((chat) => [chat.name, chat.description].join(' ').toLowerCase().includes(search.toLowerCase())), [chats, search]);
  const visibleNegotiationChats = useMemo(() => (negotiationChats || []).filter((chat) => [chat.post_title, chat.seller_email, chat.buyer_email, chat.last_message].join(' ').toLowerCase().includes(search.toLowerCase())), [negotiationChats, search]);
  const activeChat = visibleChats.find((chat) => chat.id === activeChatId) || chats.find((chat) => chat.id === activeChatId) || chats[0];
  const activeNegotiationChat = visibleNegotiationChats.find((chat) => chat.id === activeNegotiationChatId) || negotiationChats?.find((chat) => chat.id === activeNegotiationChatId) || visibleNegotiationChats[0] || null;

  const createChat = (form) => {
    const newChat = {
      id: String(Date.now()),
      name: form.name,
      description: form.description,
      visibility: form.visibility,
      voice_enabled: form.voice_enabled,
      members: ['You'],
      messages: [{ id: `welcome-${Date.now()}`, author: 'System', text: `${form.visibility === 'open' ? 'Open' : 'Private'} chat created.` }],
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setTab('chats');
  };

  const sendMessage = (chatId, payload) => {
    setChats((prev) => prev.map((chat) => chat.id === chatId ? {
      ...chat,
      messages: [...chat.messages, { id: String(Date.now()), ...payload }],
    } : chat));
  };

  const inviteToChat = (chatId) => {
    setChats((prev) => prev.map((chat) => chat.id === chatId ? {
      ...chat,
      members: chat.members.includes('New Friend') ? chat.members : [...chat.members, 'New Friend'],
      messages: [...chat.messages, { id: String(Date.now()), author: 'System', text: 'New Friend has been invited to the chat.' }],
    } : chat));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-4 py-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('messages.title', undefined, 'Community Social')}</h2>
            <p className="text-xs text-muted-foreground">{t('messages.subtitle', undefined, 'Collectors can post, chat, invite friends, and talk live in private rooms.')}</p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary">
            <Radio className="w-3 h-3" /> {t('messages.liveSocial', undefined, 'Live social')}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('messages.searchPlaceholder', undefined, 'Search chats and social activity...')} className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTab('feed')} className={`rounded-xl px-3 py-2 text-xs font-medium ${tab === 'feed' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{t('messages.feed', undefined, 'Feed')}</button>
          <button onClick={() => setTab('negotiations')} className={`rounded-xl px-3 py-2 text-xs font-medium ${tab === 'negotiations' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{t('messages.negotiations', undefined, 'Negotiations')}</button>
          <button onClick={() => setTab('chats')} className={`rounded-xl px-3 py-2 text-xs font-medium ${tab === 'chats' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{t('messages.chats', undefined, 'Chats')}</button>
          <button onClick={() => setTab('create')} className={`rounded-xl px-3 py-2 text-xs font-medium ${tab === 'create' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{t('messages.createRoom', undefined, 'Create Room')}</button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {tab === 'feed' && <SocialFeed />}

        {tab === 'negotiations' && (
          <div className="space-y-4">
            <TradeNegotiationFeed onOpenChat={(chatId) => {
              setActiveNegotiationChatId(chatId);
              setTab('chats');
            }} />
          </div>
        )}

        {tab === 'chats' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-primary">{t('messages.chatModes', undefined, 'Chat modes')}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t('messages.chatModesDesc', undefined, 'Global chat is open to everyone, while personal group chats can be open to join or locked to invites only, with optional voice room controls.')}</p>
            </div>
            <ChatDirectory chats={visibleChats} activeChatId={activeChat?.id} onSelectChat={setActiveChatId} onCreateChat={() => setTab('create')} />
            {activeNegotiationChat && <TradeNegotiationChatRoom chat={activeNegotiationChat} currentUserEmail={user?.email} />}
            {activeChat && <ChatRoom chat={activeChat} onSendMessage={sendMessage} onInvite={inviteToChat} />}
          </div>
        )}

        {tab === 'create' && <CreateChatPanel onCreate={createChat} />}
      </div>
    </div>
  );
}