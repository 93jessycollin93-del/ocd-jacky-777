# Jackie Intelligence Upgrade — All Four Systems

## 1. Database Migration
Create two new tables:
- **`jackie_memory`** — stores extracted facts, preferences, decisions from conversations
  - Fields: user_id, key, value, category (preference/decision/context/pattern), source_conversation_id, confidence, created_at, updated_at
  - RLS: users can only access their own memories
- **`jackie_tasks`** — persistent coding task tracker
  - Fields: user_id, title, description, status (todo/in_progress/done/blocked), priority (low/medium/high/critical), category, due_date, created_at, updated_at
  - RLS: users can only access their own tasks

## 2. Edge Function: `jackie-image`
- New edge function that calls Lovable AI image generation models
- Accepts a text prompt, returns base64 image data
- Stores generated images in the `chat-attachments` storage bucket
- Uses LOVABLE_API_KEY (already configured)

## 3. Backend Logic (`src/lib/`)
- **`jackie-memory.ts`** — CRUD for memory entries, auto-extraction of key facts from AI responses, memory injection into chat context
- **`jackie-tasks.ts`** — CRUD for tasks, status management, task summary for context injection
- **`jackie-files.ts`** — Browse/search attachments in storage, retrieve file metadata, display in chat

## 4. Frontend Integration
- Update `jackie-chat` edge function system prompt to include memory context + active tasks
- Add `/` commands in chat: `/remember`, `/tasks`, `/files`, `/imagine`
- Task panel accessible from chat sidebar
- Memory auto-extracts from conversations (no manual work needed)

## 5. Chat Context Enhancement
- Before each message, inject: recent memories, active tasks, uploaded file context
- Jackie becomes aware of past decisions and current priorities automatically
