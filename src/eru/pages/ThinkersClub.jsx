import { useState } from 'react';
import { Brain, Users, MessageCircle, Flame, Star, ChevronRight, Hash, Send, ArrowLeft, BookOpen } from 'lucide-react';
import CollabScratchpad from '../components/CollabScratchpad';

const SERVERS = [
  { id: 1, name: 'Philosophy & Existence', desc: 'Big questions about consciousness, reality, and meaning', members: 1284, color: '#7c4dff', channels: ['#general', '#consciousness', '#free-will', '#simulation-theory'], hot: true },
  { id: 2, name: 'Frontier Science', desc: 'Cutting edge discoveries, theories, and speculation', members: 892, color: '#2196f3', channels: ['#physics', '#biology', '#ai-consciousness', '#cosmology'], hot: false },
  { id: 3, name: 'Economic Futures', desc: 'Web3, post-scarcity, and the economics of tomorrow', members: 643, color: '#00e676', channels: ['#crypto-theory', '#ubi', '#dao-governance'], hot: true },
  { id: 4, name: 'Creative Minds', desc: 'Art, design, music, and the nature of creativity itself', members: 521, color: '#ff9800', channels: ['#inspiration', '#criticism', '#collaboration'], hot: false },
];

const CHALLENGES = [
  { id: 1, title: 'The Ship of Theseus in the Age of AI', prompt: 'If every component of an AI is replaced with better parts, is it still the same AI? Does identity persist through radical change?', votes: 342, category: 'Philosophy', difficulty: 'Deep' },
  { id: 2, title: 'Can mathematics be invented?', prompt: 'Is math a human invention or an objective truth we discover? What are the implications of each answer?', votes: 219, category: 'Science', difficulty: 'Moderate' },
  { id: 3, title: 'The Value Alignment Problem', prompt: 'How do we encode human values into artificial intelligence if humans themselves disagree on values?', votes: 187, category: 'AI Ethics', difficulty: 'Expert' },
];

const DIFF_COLOR = { Deep: '#7c4dff', Moderate: '#2196f3', Expert: '#ff5252' };

export default function ThinkersClub() {
  const [tab, setTab] = useState('servers');
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, author: 'Philosopher_K', text: 'The question of free will fundamentally changes once you consider determinism at the quantum level.', time: '2m ago' },
    { id: 2, author: 'NeuralNomad', text: 'But quantum indeterminacy doesn\'t necessarily imply free will — randomness isn\'t choice.', time: '1m ago' },
    { id: 3, author: 'Stoic_Dev', text: 'Perhaps free will is an emergent property of complexity, not a fundamental force.', time: 'just now' },
  ]);

  const engageChallenge = (challenge) => {
    setActiveServer({
      id: `challenge-${challenge.id}`,
      name: challenge.title,
      desc: challenge.prompt,
      members: challenge.votes,
      color: DIFF_COLOR[challenge.difficulty] || '#7c4dff',
      channels: ['#challenge-room', '#arguments', '#counterpoints'],
      hot: true,
    });
    setActiveChannel('#challenge-room');
    setMessages([
      { id: 1, author: 'Challenge Host', text: challenge.prompt, time: 'just now' },
      { id: 2, author: 'Moderator', text: `Welcome to ${challenge.title}. Share your position, question assumptions, and build on others’ ideas.`, time: 'just now' },
    ]);
  };

  const sendMessage = () => {
    if (!msg.trim()) return;
    setMessages(p => [...p, { id: Date.now(), author: 'You', text: msg, time: 'just now' }]);
    setMsg('');
  };

  if (activeServer && activeChannel) return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {showScratchpad && (
        <CollabScratchpad
          channel={activeChannel}
          serverColor={activeServer.color}
          onClose={() => setShowScratchpad(false)}
          onSubmitReview={(content) => {
            setShowScratchpad(false);
            alert('Submitted for review! Check the App Review page.');
          }}
        />
      )}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <button onClick={() => setActiveChannel(null)} className="text-muted-foreground"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-2 h-2 rounded-full" style={{ background: activeServer.color }} />
        <div className="flex-1">
          <p className="font-medium text-sm">{activeChannel}</p>
          <p className="text-xs text-muted-foreground">{activeServer.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowScratchpad(true)}
            className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-lg px-2 py-1 text-xs font-medium hover:bg-primary/20 transition-colors">
            <BookOpen className="w-3 h-3" /> Scratchpad
          </button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />{activeServer.members.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto">
        {messages.map(m => (
          <div key={m.id} className={`${m.author==='You'?'flex flex-col items-end':''}`}>
            <p className="text-xs text-muted-foreground mb-1">{m.author} · {m.time}</p>
            <div className={`rounded-xl px-3 py-2 max-w-[85%] ${m.author==='You'?'bg-primary text-primary-foreground':'bg-card border border-border'}`}>
              <p className="text-sm">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4 flex items-center gap-2">
        <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key==='Enter'&&sendMessage()}
          placeholder={`Share your thought in ${activeChannel}...`}
          className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <button onClick={sendMessage} className="bg-primary text-primary-foreground rounded-xl p-2.5">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (activeServer) return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <button onClick={() => setActiveServer(null)} className="text-muted-foreground"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: `${activeServer.color}20`, border: `1px solid ${activeServer.color}40` }}>
          🧠
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{activeServer.name}</p>
          <p className="text-xs text-muted-foreground">{activeServer.members.toLocaleString()} members</p>
        </div>
      </div>
      <div className="px-4 py-4">
        <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">Channels</p>
        <div className="space-y-1">
          {activeServer.channels.map(ch => (
            <button key={ch} onClick={() => setActiveChannel(ch)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors text-left">
              <Hash className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm">{ch.replace('#','')}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> The Thinkers Club
        </h2>
        <p className="text-xs text-muted-foreground">Challenge your mind · Meet curious people · Exchange ideas</p>
      </div>

      <div className="flex border-b border-border">
        {[{id:'servers',label:'Servers'},{id:'challenges',label:'Challenges'},{id:'create',label:'Create Server'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab===t.id?'text-primary border-b-2 border-primary':'text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3 max-w-full overflow-x-hidden">
        {tab === 'servers' && SERVERS.map(s => (
          <button key={s.id} onClick={() => setActiveServer(s)}
            className="w-full bg-card border border-border rounded-xl p-4 text-left hover:bg-secondary/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${s.color}20`, border: `1px solid ${s.color}40` }}>🧠</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{s.name}</p>
                    {s.hot && <span className="flex items-center gap-0.5 text-xs text-orange-400"><Flame className="w-3 h-3" />Hot</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" />{s.members.toLocaleString()}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle className="w-3 h-3" />{s.channels.length} channels</span>
            </div>
          </button>
        ))}

        {tab === 'challenges' && CHALLENGES.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm">{c.title}</p>
              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${DIFF_COLOR[c.difficulty]}20`, color: DIFF_COLOR[c.difficulty], border: `1px solid ${DIFF_COLOR[c.difficulty]}40` }}>
                {c.difficulty}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{c.prompt}</p>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{c.category}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="w-3 h-3" />{c.votes}</span>
              </div>
              <button onClick={() => engageChallenge(c)} className="text-primary text-xs font-medium hover:underline">Engage →</button>
            </div>
          </div>
        ))}

        {tab === 'create' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Create a new server for your intellectual community.</p>
            <input placeholder="Server name..." className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none" />
            <textarea placeholder="What is this server about? What questions will you explore?" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none min-h-[80px]" />
            <select className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none">
              <option>🧠 Philosophy</option>
              <option>🔬 Science</option>
              <option>💻 Technology</option>
              <option>🎨 Creative Arts</option>
              <option>📈 Economics</option>
              <option>🌍 Society & Culture</option>
            </select>
            <button className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm">Create Server</button>
          </div>
        )}
      </div>
    </div>
  );
}