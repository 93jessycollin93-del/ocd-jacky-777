import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { BookOpenText, MessageSquare, Users, Database, Plus, Save } from 'lucide-react';

const EMPTY_WORKSPACE = { name: '', description: '', member_emails: [], linked_bot_ids: [], linked_prompt_template_ids: [] };
const EMPTY_KNOWLEDGE = { title: '', category: 'team_notes', content: '', keywords: '', linked_bot_ids: [], linked_template_ids: [] };
const EMPTY_COMMENT = { template_id: '', anchor_label: '', comment_text: '', mentioned_emails: '' };

export default function SharedWorkspacePanel({ bots, promptTemplates }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState([]);
  const [comments, setComments] = useState([]);
  const [workspaceForm, setWorkspaceForm] = useState(EMPTY_WORKSPACE);
  const [knowledgeForm, setKnowledgeForm] = useState(EMPTY_KNOWLEDGE);
  const [commentForm, setCommentForm] = useState(EMPTY_COMMENT);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [me, setMe] = useState(null);

  const load = async () => {
    const [workspaceRows, knowledgeRows, commentRows, user] = await Promise.all([
      base44.entities.SharedBotWorkspace.list('-updated_date', 100),
      base44.entities.SharedKnowledgeBase.list('-updated_date', 200),
      base44.entities.PromptTemplateComment.list('-updated_date', 200),
      base44.auth.me()
    ]);
    setWorkspaces(workspaceRows || []);
    setKnowledgeEntries(knowledgeRows || []);
    setComments(commentRows || []);
    setMe(user || null);
    if (!selectedWorkspaceId && workspaceRows?.[0]?.id) setSelectedWorkspaceId(workspaceRows[0].id);
  };

  useEffect(() => { load(); }, []);

  const selectedWorkspace = workspaces.find((item) => item.id === selectedWorkspaceId) || null;
  const workspaceKnowledge = useMemo(() => knowledgeEntries.filter((item) => item.workspace_id === selectedWorkspaceId), [knowledgeEntries, selectedWorkspaceId]);
  const workspaceComments = useMemo(() => comments.filter((item) => item.workspace_id === selectedWorkspaceId), [comments, selectedWorkspaceId]);

  const toggleArrayValue = (values, nextValue) => values.includes(nextValue) ? values.filter((item) => item !== nextValue) : [...values, nextValue];

  const createWorkspace = async () => {
    if (!workspaceForm.name.trim() || !me?.email) return;
    await base44.entities.SharedBotWorkspace.create({
      ...workspaceForm,
      owner_email: me.email,
      member_emails: workspaceForm.member_emails,
      status: 'active'
    });
    setWorkspaceForm(EMPTY_WORKSPACE);
    load();
  };

  const saveKnowledge = async () => {
    if (!selectedWorkspaceId || !knowledgeForm.title.trim() || !knowledgeForm.content.trim()) return;
    await base44.entities.SharedKnowledgeBase.create({
      workspace_id: selectedWorkspaceId,
      title: knowledgeForm.title,
      category: knowledgeForm.category,
      content: knowledgeForm.content,
      keywords: knowledgeForm.keywords.split(',').map((item) => item.trim()).filter(Boolean),
      linked_bot_ids: knowledgeForm.linked_bot_ids,
      linked_template_ids: knowledgeForm.linked_template_ids,
    });
    setKnowledgeForm(EMPTY_KNOWLEDGE);
    load();
  };

  const saveComment = async () => {
    if (!selectedWorkspaceId || !commentForm.template_id || !commentForm.comment_text.trim()) return;
    await base44.entities.PromptTemplateComment.create({
      workspace_id: selectedWorkspaceId,
      template_id: commentForm.template_id,
      comment_text: commentForm.comment_text,
      anchor_label: commentForm.anchor_label,
      mentioned_emails: commentForm.mentioned_emails.split(',').map((item) => item.trim()).filter(Boolean),
      status: 'open'
    });
    setCommentForm(EMPTY_COMMENT);
    load();
  };

  const toggleCommentStatus = async (comment) => {
    await base44.entities.PromptTemplateComment.update(comment.id, {
      status: comment.status === 'resolved' ? 'open' : 'resolved'
    });
    load();
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Shared Bot Workspace</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Create team workspaces, comment on prompt templates, and manage shared knowledge for collaborative bot development.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">New workspace</p>
            <input value={workspaceForm.name} onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Workspace name" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
            <input value={workspaceForm.description} onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
            <input value={workspaceForm.member_emails.join(', ')} onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, member_emails: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} placeholder="Member emails, comma separated" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-foreground">Link bots</p>
              <div className="flex flex-wrap gap-2">{bots.map((bot) => <button key={bot.id} onClick={() => setWorkspaceForm((prev) => ({ ...prev, linked_bot_ids: toggleArrayValue(prev.linked_bot_ids, bot.id) }))} className={`rounded-full border px-2 py-1 text-[10px] ${workspaceForm.linked_bot_ids.includes(bot.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>{bot.name}</button>)}</div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-foreground">Link prompt templates</p>
              <div className="flex flex-wrap gap-2">{promptTemplates.map((template) => <button key={template.id} onClick={() => setWorkspaceForm((prev) => ({ ...prev, linked_prompt_template_ids: toggleArrayValue(prev.linked_prompt_template_ids, template.id) }))} className={`rounded-full border px-2 py-1 text-[10px] ${workspaceForm.linked_prompt_template_ids.includes(template.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>{template.name}</button>)}</div>
            </div>
            <button onClick={createWorkspace} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"><Plus className="w-3.5 h-3.5" /> Create workspace</button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">Team workspaces</p>
            {workspaces.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No shared workspaces yet.</div> : workspaces.map((workspace) => (
              <button key={workspace.id} onClick={() => setSelectedWorkspaceId(workspace.id)} className={`w-full rounded-xl border px-3 py-3 text-left ${selectedWorkspaceId === workspace.id ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
                <p className="text-xs font-semibold text-foreground">{workspace.name}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{workspace.description || 'No description'} · {(workspace.member_emails || []).length} members</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Shared knowledge base</p>
            </div>
            <input value={knowledgeForm.title} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Knowledge title" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
            <select value={knowledgeForm.category} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
              <option value="team_notes">Team notes</option>
              <option value="prompting">Prompting</option>
              <option value="bot_behavior">Bot behavior</option>
              <option value="testing">Testing</option>
              <option value="deployment">Deployment</option>
              <option value="research">Research</option>
            </select>
            <textarea value={knowledgeForm.content} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, content: e.target.value }))} placeholder="Document shared guidance, experiments, or working practices..." className="min-h-[120px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
            <input value={knowledgeForm.keywords} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, keywords: e.target.value }))} placeholder="Keywords, comma separated" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
            <button onClick={saveKnowledge} disabled={!selectedWorkspaceId} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"><Save className="w-3.5 h-3.5" /> Save knowledge</button>
            <div className="space-y-2">{workspaceKnowledge.map((entry) => <div key={entry.id} className="rounded-xl border border-border bg-background p-3"><p className="text-xs font-semibold text-foreground">{entry.title}</p><p className="mt-1 text-[10px] text-primary uppercase">{entry.category}</p><p className="mt-2 text-[11px] text-muted-foreground whitespace-pre-wrap">{entry.content}</p></div>)}</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Prompt template comments</p>
            </div>
            <select value={commentForm.template_id} onChange={(e) => setCommentForm((prev) => ({ ...prev, template_id: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
              <option value="">Choose a prompt template</option>
              {(selectedWorkspace?.linked_prompt_template_ids || []).map((id) => {
                const template = promptTemplates.find((item) => item.id === id);
                return template ? <option key={template.id} value={template.id}>{template.name}</option> : null;
              })}
            </select>
            <input value={commentForm.anchor_label} onChange={(e) => setCommentForm((prev) => ({ ...prev, anchor_label: e.target.value }))} placeholder="Optional focus area, e.g. system prompt opening" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
            <textarea value={commentForm.comment_text} onChange={(e) => setCommentForm((prev) => ({ ...prev, comment_text: e.target.value }))} placeholder="Add feedback or a collaboration note for this prompt template..." className="min-h-[100px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
            <input value={commentForm.mentioned_emails} onChange={(e) => setCommentForm((prev) => ({ ...prev, mentioned_emails: e.target.value }))} placeholder="Mention emails, comma separated" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
            <button onClick={saveComment} disabled={!selectedWorkspaceId} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"><BookOpenText className="w-3.5 h-3.5" /> Add comment</button>
            <div className="space-y-2">{workspaceComments.map((comment) => {
              const template = promptTemplates.find((item) => item.id === comment.template_id);
              return (
                <div key={comment.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{template?.name || 'Prompt template'}</p>
                      <p className="text-[10px] text-muted-foreground">{comment.anchor_label || 'General comment'}</p>
                    </div>
                    <button onClick={() => toggleCommentStatus(comment)} className={`rounded-full px-2 py-1 text-[10px] font-medium ${comment.status === 'resolved' ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-300'}`}>{comment.status}</button>
                  </div>
                  <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{comment.comment_text}</p>
                </div>
              );
            })}</div>
          </div>
        </div>
      </div>
    </div>
  );
}