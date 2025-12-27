import { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  FileText,
  Edit3,
  ChevronUp,
} from 'lucide-react';
import { useAIStore, useVaultStore } from '../../stores';
import { cn } from '../../lib';

interface AIActionsProps {
  className?: string;
}

export function AIActions({ className }: AIActionsProps) {
  const { askAboutNote, summarizeNote, editNoteWithAI, isLoading } = useAIStore();
  const { activeNoteId } = useVaultStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'ask' | 'summarize' | 'edit' | null>(null);
  const [input, setInput] = useState('');

  if (!activeNoteId) return null;

  const handleAction = async () => {
    if (!input.trim()) return;

    try {
      if (mode === 'ask') {
        await askAboutNote(activeNoteId, input);
      } else if (mode === 'summarize') {
        await summarizeNote(activeNoteId);
      } else if (mode === 'edit') {
        await editNoteWithAI(activeNoteId, input);
      }

      setInput('');
      setMode(null);
    } catch (error) {
      console.error('AI action failed:', error);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="p-2 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 text-accent hover:from-accent/30 hover:to-accent/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        title="AI Actions"
      >
        <Sparkles className="w-4 h-4" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in duration-200">
          <div className="p-3 space-y-2">
            <button
              onClick={() => setMode('ask')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                mode === 'ask'
                  ? 'bg-accent text-white'
                  : 'bg-background-tertiary/50 hover:bg-background-tertiary text-foreground hover:border-border/50 border border border-transparent'
              )}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">Ask About Note</div>
                <div className="text-xs opacity-70">Ask questions about this note</div>
              </div>
            </button>

            <button
              onClick={() => setMode('summarize')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                mode === 'summarize'
                  ? 'bg-accent text-white'
                  : 'bg-background-tertiary/50 hover:bg-background-tertiary text-foreground hover:border-border/50 border border border-transparent'
              )}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">Summarize Note</div>
                <div className="text-xs opacity-70">Get a 2-3 sentence summary</div>
              </div>
            </button>

            <button
              onClick={() => setMode('edit')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                mode === 'edit'
                  ? 'bg-accent text-white'
                  : 'bg-background-tertiary/50 hover:bg-background-tertiary text-foreground hover:border-border/50 border border border-transparent'
              )}
            >
              <Edit3 className="w-4 h-4 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">Edit with AI</div>
                <div className="text-xs opacity-70">Edit content using AI</div>
              </div>
            </button>
          </div>

          {/* Action Panel */}
          {mode && (
            <div className="border-t border-border/50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setMode(null)}
                  className="text-xs text-foreground-muted hover:text-foreground flex items-center gap-1"
                >
                  <ChevronUp className="w-3 h-3" />
                  Back
                </button>
                <span className="text-xs text-foreground-muted font-medium">
                  {mode === 'ask' && 'Ask Question'}
                  {mode === 'summarize' && 'Summarize'}
                  {mode === 'edit' && 'Edit Note'}
                </span>
              </div>

              {mode === 'ask' || mode === 'edit' ? (
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAction();
                    }
                  }}
                  placeholder={mode === 'ask' ? 'Type your question...' : 'What should AI do?'}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-foreground-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all resize-none"
                  rows={3}
                  disabled={isLoading}
                />
              ) : (
                <p className="text-xs text-foreground-muted bg-background-tertiary/50 rounded-lg px-3 py-2.5">
                  AI will generate a 2-3 sentence summary of this note.
                </p>
              )}

              <button
                onClick={handleAction}
                disabled={!input.trim() || isLoading}
                className="w-full px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-medium transition-all hover:shadow-lg hover:shadow-accent/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <>
                    {mode === 'ask' && 'Ask AI'}
                    {mode === 'summarize' && 'Generate Summary'}
                    {mode === 'edit' && 'Apply Edit'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Close button */}
          {!mode && (
            <div className="p-2">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-2 bg-background-tertiary/50 hover:bg-background-tertiary text-foreground-muted rounded-lg text-xs transition-all"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
