import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import MiniAppHeader from '../components/bot-mini-app/MiniAppHeader';
import MiniAppWalletPanel from '../components/bot-mini-app/MiniAppWalletPanel';
import MiniAppNftPanel from '../components/bot-mini-app/MiniAppNftPanel';
import MiniAppTaskQueue from '../components/bot-mini-app/MiniAppTaskQueue';
import MiniAppChatPanel from '../components/bot-mini-app/MiniAppChatPanel';

export default function BotMiniApp() {
  const [bot, setBot] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [holdings, setHoldings] = useState({});
  const [nfts, setNfts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskDraft, setTaskDraft] = useState('');

  const botId = useMemo(() => new URLSearchParams(window.location.search).get('bot'), []);

  useEffect(() => {
    if (!botId) return;

    const load = async () => {
      const [botRows, me] = await Promise.all([
        base44.entities.UserBot.filter({ id: botId }, '-created_date', 1),
        base44.auth.me().catch(() => null),
      ]);

      const activeBot = botRows?.[0] || null;
      setBot(activeBot);

      if (!me) return;

      const [walletRows, nftRows, taskRows] = await Promise.all([
        base44.entities.ConnectedWallet?.filter?.({ user_email: me.email }, '-created_date', 20).catch(() => []),
        base44.entities.NFT?.filter?.({ owner_email: me.email }, '-updated_date', 4).catch(() => []),
        base44.entities.Task?.filter?.({ owner_email: me.email, bot_id: botId }, '-updated_date', 10).catch(() => []),
      ]);

      setWallets(walletRows || []);
      setNfts(nftRows || []);
      setTasks(taskRows || []);

      const holdingsMap = {};
      await Promise.all((walletRows || []).map(async (wallet) => {
        const rows = await base44.entities.WalletHolding?.filter?.({ wallet_id: wallet.id }, '-value_usd', 3).catch(() => []);
        holdingsMap[wallet.id] = rows || [];
      }));
      setHoldings(holdingsMap);
    };

    load();
  }, [botId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const nextUserMessage = { role: 'user', content: input };
    const nextAssistantMessage = { role: 'assistant', content: bot?.greeting_message || bot?.description || 'Bot is ready.' };
    setMessages((prev) => [...prev, nextUserMessage, nextAssistantMessage]);
    setInput('');
  };

  const createTask = async () => {
    if (!taskDraft.trim() || !bot) return;
    const me = await base44.auth.me().catch(() => null);
    const newTask = await base44.entities.Task.create({
      bot_id: bot.id,
      bot_name: bot.name,
      title: taskDraft,
      status: 'todo',
      priority: 'medium',
      task_type: 'bot_action',
      owner_email: me?.email || '',
    });
    setTasks((prev) => [newTask, ...prev]);
    setTaskDraft('');
  };

  const toggleTask = async (task) => {
    const nextStatus = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
    await base44.entities.Task.update(task.id, { status: nextStatus });
    setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, status: nextStatus } : item));
  };

  if (!bot) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 pb-24 flex items-center justify-center">
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm font-semibold text-foreground">Mini-app bot not found</p>
          <p className="mt-1 text-xs text-muted-foreground">Use a deployed bot link from the AI Lab deployment pipeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-3 py-3 pb-24">
      <div className="mx-auto max-w-md space-y-3">
        <MiniAppHeader bot={bot} />
        <MiniAppWalletPanel wallets={wallets} holdings={holdings} />
        <MiniAppNftPanel nfts={nfts} />
        <MiniAppTaskQueue
          tasks={tasks}
          draftTitle={taskDraft}
          onDraftTitleChange={setTaskDraft}
          onCreateTask={createTask}
          onToggleTask={toggleTask}
        />
        <MiniAppChatPanel
          bot={bot}
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSend={sendMessage}
        />
      </div>
    </div>
  );
}