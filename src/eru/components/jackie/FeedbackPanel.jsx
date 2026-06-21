import { useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { MessageSquare, Star } from 'lucide-react';

export default function FeedbackPanel({ onSubmitted }) {
  const [form, setForm] = useState({ category: 'suggestion', rating: 5, title: '', message: '' });
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    await base44.entities.JackieFeedback.create({
      ...form,
      context: 'jackie_ai'
    });
    onSubmitted?.();
    setForm({ category: 'suggestion', rating: 5, title: '', message: '' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Feedback System</h3>
        <p className="text-xs text-muted-foreground mt-1">Share performance feedback and improvement ideas for Jackie AI.</p>
      </div>
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Short title"
        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs"
      />
      <textarea
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        placeholder="What should Jackie improve?"
        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs min-h-[90px] resize-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="bg-secondary border border-border rounded-lg px-3 py-2 text-xs"
        >
          <option value="suggestion">Suggestion</option>
          <option value="performance">Performance</option>
          <option value="bug">Bug</option>
          <option value="content">Content</option>
        </select>
        <select
          value={form.rating}
          onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
          className="bg-secondary border border-border rounded-lg px-3 py-2 text-xs"
        >
          {[5,4,3,2,1].map((rating) => (
            <option key={rating} value={rating}>{rating} Star{rating > 1 ? 's' : ''}</option>
          ))}
        </select>
      </div>
      <button onClick={submit} className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-2">
        {saved ? <Star className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
        {saved ? 'Feedback sent' : 'Send feedback'}
      </button>
    </div>
  );
}