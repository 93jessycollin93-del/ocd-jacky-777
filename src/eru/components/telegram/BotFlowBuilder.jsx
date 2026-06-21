import { useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { Bot, Command, MessageSquareText, Sparkles, Trash2, Zap } from 'lucide-react';

const BLOCK_LIBRARY = [
  {
    id: 'trait-friendly',
    type: 'trait',
    title: 'Friendly tone',
    description: 'Warm, positive, and conversational replies.',
    value: 'Be warm, friendly, and encouraging in every reply.',
    icon: Sparkles,
  },
  {
    id: 'trait-expert',
    type: 'trait',
    title: 'Expert guide',
    description: 'Confident and structured explanations.',
    value: 'Answer with confidence, structure, and practical clarity.',
    icon: Bot,
  },
  {
    id: 'trigger-greeting',
    type: 'trigger',
    title: 'Greeting trigger',
    description: 'When users say hello or start chatting.',
    value: 'If the message is a greeting, respond with a short welcome and offer help.',
    icon: MessageSquareText,
  },
  {
    id: 'trigger-support',
    type: 'trigger',
    title: 'Support trigger',
    description: 'When users ask for help or support.',
    value: 'If the user asks for help, provide short steps and ask one follow-up question.',
    icon: Zap,
  },
  {
    id: 'command-help',
    type: 'command',
    title: '/help command',
    description: 'Explain what the bot can do.',
    value: 'Command /help: show a concise list of what the bot can do.',
    icon: Command,
  },
  {
    id: 'command-pricing',
    type: 'command',
    title: '/pricing command',
    description: 'Share pricing or plan details.',
    value: 'Command /pricing: reply with the current plans and invite the user to ask questions.',
    icon: Command,
  },
];

function FlowBlock({ block, indexLabel, onRemove, dragHandleProps, draggableProps, innerRef, isDragging = false }) {
  const Icon = block.icon || Sparkles;

  return (
    <div
      ref={innerRef}
      {...(draggableProps || {})}
      className={`rounded-xl border px-3 py-2 bg-card transition-shadow ${isDragging ? 'shadow-xl border-primary' : 'border-border'}`}
    >
      {indexLabel && <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">{indexLabel}</div>}
      <div className="flex items-start gap-2">
        <div
          {...(dragHandleProps || {})}
          className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing"
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{block.title}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{block.description}</p>
        </div>
        {onRemove && (
          <button onClick={() => onRemove(block.instanceId)} className="text-muted-foreground hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function BotFlowBuilder({ value, onChange }) {
  const flowItems = useMemo(() => value || [], [value]);
  const [libraryItems] = useState(BLOCK_LIBRARY);

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === 'library' && destination.droppableId === 'flow') {
      const block = libraryItems[source.index];
      onChange([
        ...flowItems.slice(0, destination.index),
        { ...block, instanceId: `${block.id}-${Date.now()}` },
        ...flowItems.slice(destination.index),
      ]);
      return;
    }

    if (source.droppableId === 'flow' && destination.droppableId === 'flow') {
      const reordered = [...flowItems];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      onChange(reordered);
    }
  };

  const removeItem = (instanceId) => onChange(flowItems.filter((item) => item.instanceId !== instanceId));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">Visual AI Flow Builder</p>
        <p className="text-xs text-muted-foreground mt-1">Drag personality, trigger, and command blocks into your bot flow.</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid gap-4 md:grid-cols-[1fr_1.15fr]">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Block library</p>
            <Droppable droppableId="library" isDropDisabled>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {libraryItems.map((block, index) => (
                    <Draggable key={block.id} draggableId={block.id} index={index}>
                      {(dragProvided, snapshot) => (
                        <FlowBlock
                          block={block}
                          innerRef={dragProvided.innerRef}
                          draggableProps={dragProvided.draggableProps}
                          dragHandleProps={dragProvided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                        />
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bot response flow</p>
            <Droppable droppableId="flow">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`rounded-2xl border-2 border-dashed p-3 min-h-[220px] transition-colors ${snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30'}`}
                >
                  {flowItems.length === 0 ? (
                    <div className="h-full min-h-[190px] flex items-center justify-center text-center px-4">
                      <p className="text-sm text-muted-foreground">Drop blocks here to build your bot behavior visually.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {flowItems.map((block, index) => (
                        <Draggable key={block.instanceId} draggableId={block.instanceId} index={index}>
                          {(dragProvided, snapshotItem) => (
                            <FlowBlock
                              block={block}
                              indexLabel={`Step ${index + 1}`}
                              onRemove={removeItem}
                              innerRef={dragProvided.innerRef}
                              draggableProps={dragProvided.draggableProps}
                              dragHandleProps={dragProvided.dragHandleProps}
                              isDragging={snapshotItem.isDragging}
                            />
                          )}
                        </Draggable>
                      ))}
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}