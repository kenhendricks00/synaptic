import { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  FileText,
  Edit3,
  ChevronUp,
  Radio,
  Square,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Layers,
  HelpCircle,
  Check,
  X,
  Plus,
} from 'lucide-react';
import { useAIStore, useVaultStore, useLearningStore } from '../../stores';
import { cn } from '../../lib';
import { Save } from 'lucide-react';

interface AIActionsProps {
  className?: string;
}

export function AIActions({ className }: AIActionsProps) {
  const {
    askAboutNote,
    summarizeNote,
    editNoteWithAI,
    isLoading,
    generatePodcast,
    stopPodcast,
    pausePodcast,
    resumePodcast,
    podcastStatus,
    podcastCurrentSpeaker,
    podcastCurrentText,
    podcastSegments,
    generateFlashcards,
    generateQuiz,
    generatedFlashcards,
    generatedQuiz,
    clearGeneratedContent
  } = useAIStore();
  const { activeNoteId, notes } = useVaultStore();
  const { addDeck, addQuiz, addPodcast } = useLearningStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'ask' | 'summarize' | 'edit' | 'podcast' | 'flashcards' | 'quiz' | null>(null);
  const [input, setInput] = useState('');
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);

  if (!activeNoteId) return null;

  const handleAction = async () => {
    try {
      if (mode === 'ask') {
        if (!input.trim()) return;
        await askAboutNote(activeNoteId, input);
      } else if (mode === 'summarize') {
        // Summarize doesn't need input
        await summarizeNote(activeNoteId);
      } else if (mode === 'edit') {
        if (!input.trim()) return;
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

            <button
              onClick={() => setMode('podcast')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                mode === 'podcast'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-background-tertiary/50 hover:bg-background-tertiary text-foreground hover:border-border/50 border border border-transparent'
              )}
            >
              <Radio className="w-4 h-4 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">Generate Podcast</div>
                <div className="text-xs opacity-70">Two AI hosts discuss this note</div>
              </div>
            </button>

            <button
              onClick={() => {
                setMode('flashcards');
                clearGeneratedContent();
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                mode === 'flashcards'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'bg-background-tertiary/50 hover:bg-background-tertiary text-foreground hover:border-border/50 border border border-transparent'
              )}
            >
              <Layers className="w-4 h-4 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">Generate Flashcards</div>
                <div className="text-xs opacity-70">Create study cards from this note</div>
              </div>
            </button>

            <button
              onClick={() => {
                setMode('quiz');
                clearGeneratedContent();
                setQuizIndex(0);
                setQuizScore(0);
                setQuizAnswered(null);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                mode === 'quiz'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                  : 'bg-background-tertiary/50 hover:bg-background-tertiary text-foreground hover:border-border/50 border border border-transparent'
              )}
            >
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">Generate Quiz</div>
                <div className="text-xs opacity-70">Test your knowledge with questions</div>
              </div>
            </button>
          </div>

          {/* Action Panel */}
          {mode && (
            <div className="border-t border-border/50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    if (mode === 'podcast' && podcastStatus === 'playing') {
                      stopPodcast();
                    }
                    setMode(null);
                  }}
                  className="text-xs text-foreground-muted hover:text-foreground flex items-center gap-1"
                >
                  <ChevronUp className="w-3 h-3" />
                  Back
                </button>
                <span className="text-xs text-foreground-muted font-medium">
                  {mode === 'ask' && 'Ask Question'}
                  {mode === 'summarize' && 'Summarize'}
                  {mode === 'edit' && 'Edit Note'}
                  {mode === 'podcast' && 'AI Podcast'}
                </span>
              </div>

              {mode === 'podcast' ? (
                <div className="space-y-3">
                  {podcastStatus === 'idle' && (
                    <p className="text-xs text-foreground-muted bg-background-tertiary/50 rounded-lg px-3 py-2.5">
                      Generate a podcast where two AI hosts discuss this note's content.
                    </p>
                  )}

                  {podcastStatus === 'generating' && (
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg px-3 py-4 text-center">
                      <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-foreground-secondary">Generating podcast script...</p>
                    </div>
                  )}

                  {(podcastStatus === 'playing' || podcastStatus === 'paused') && (
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg px-4 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Waveform Animation - paused when podcast is paused */}
                          <div className="flex items-center gap-0.5 h-6">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full"
                                style={{
                                  animation: podcastStatus === 'playing' ? `waveform 0.8s ease-in-out infinite` : 'none',
                                  animationDelay: `${i * 0.1}s`,
                                  height: podcastStatus === 'paused' ? '40%' : '100%',
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {podcastCurrentSpeaker || (podcastStatus === 'paused' ? 'Paused' : 'Playing...')}
                          </span>
                        </div>

                        {/* Media Controls */}
                        <div className="flex items-center gap-1">
                          {/* Play/Pause Button */}
                          <button
                            onClick={() => podcastStatus === 'paused' ? resumePodcast() : pausePodcast()}
                            className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-colors"
                            title={podcastStatus === 'paused' ? 'Resume' : 'Pause'}
                          >
                            {podcastStatus === 'paused' ? (
                              <Play className="w-4 h-4" />
                            ) : (
                              <Pause className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => stopPodcast()}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-foreground-muted hover:text-red-400 transition-colors"
                            title="Stop"
                          >
                            <Square className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-colors opacity-50 cursor-not-allowed"
                            title="Skip Back (coming soon)"
                            disabled
                          >
                            <SkipBack className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-colors opacity-50 cursor-not-allowed"
                            title="Skip Forward (coming soon)"
                            disabled
                          >
                            <SkipForward className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const note = notes.get(activeNoteId);
                              addPodcast({
                                name: note?.title || 'Podcast',
                                noteId: activeNoteId,
                                noteName: note?.title || null,
                                segments: podcastSegments
                              });
                            }}
                            className="p-1.5 rounded-lg hover:bg-purple-500/20 text-foreground-muted hover:text-purple-400 transition-colors"
                            title="Save to Learning Hub"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-foreground-muted line-clamp-2">
                        {podcastCurrentText || '...'}
                      </p>
                    </div>
                  )}

                  {podcastStatus !== 'playing' && podcastStatus !== 'paused' && (
                    <button
                      onClick={() => generatePodcast(activeNoteId)}
                      disabled={podcastStatus === 'generating'}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-sm font-medium transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {podcastStatus === 'generating' ? 'Generating...' : 'Generate Podcast'}
                    </button>
                  )}
                </div>
              ) : mode === 'ask' || mode === 'edit' ? (
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
              ) : mode === 'flashcards' ? (
                <div className="space-y-3">
                  {generatedFlashcards.length === 0 && !isLoading && (
                    <p className="text-xs text-foreground-muted bg-background-tertiary/50 rounded-lg px-3 py-2.5">
                      AI will generate flashcards based on key concepts from this note.
                    </p>
                  )}

                  {isLoading && (
                    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg px-3 py-4 text-center">
                      <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-foreground-secondary">Generating flashcards...</p>
                    </div>
                  )}

                  {generatedFlashcards.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {generatedFlashcards.map((card, i) => (
                        <div key={i} className="bg-background-tertiary/50 rounded-lg p-2.5 space-y-1">
                          <p className="text-xs font-medium text-foreground">{card.front}</p>
                          <p className="text-xs text-foreground-muted">{card.back}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {generatedFlashcards.length === 0 && !isLoading && (
                    <button
                      onClick={() => generateFlashcards(activeNoteId)}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all hover:shadow-lg"
                    >
                      Generate Flashcards
                    </button>
                  )}

                  {generatedFlashcards.length > 0 && (
                    <button
                      onClick={() => {
                        const note = notes.get(activeNoteId);
                        addDeck({
                          name: note?.title || 'Flashcard Deck',
                          noteId: activeNoteId,
                          noteName: note?.title || null,
                          cards: generatedFlashcards.map(card => ({
                            front: card.front,
                            back: card.back,
                            ease: 2.5,
                            interval: 1,
                            nextReview: new Date().toISOString()
                          }))
                        });
                        clearGeneratedContent();
                        setMode(null);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Save {generatedFlashcards.length} Cards to Learning Hub
                    </button>
                  )}
                </div>
              ) : mode === 'quiz' ? (
                <div className="space-y-3">
                  {generatedQuiz.length === 0 && !isLoading && (
                    <p className="text-xs text-foreground-muted bg-background-tertiary/50 rounded-lg px-3 py-2.5">
                      AI will generate multiple choice questions to test your knowledge.
                    </p>
                  )}

                  {isLoading && (
                    <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg px-3 py-4 text-center">
                      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-foreground-secondary">Generating quiz...</p>
                    </div>
                  )}

                  {generatedQuiz.length > 0 && quizIndex < generatedQuiz.length && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs text-foreground-muted">
                        <span>Question {quizIndex + 1} of {generatedQuiz.length}</span>
                        <span className="flex items-center gap-1">
                          Score: <span className="text-emerald-500 font-medium">{quizScore}</span>/{quizIndex}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{generatedQuiz[quizIndex].question}</p>
                      <div className="space-y-1.5">
                        {generatedQuiz[quizIndex].options.map((option, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (quizAnswered !== null) return;
                              setQuizAnswered(i);
                              if (i === generatedQuiz[quizIndex].correctIndex) {
                                setQuizScore(s => s + 1);
                              }
                            }}
                            disabled={quizAnswered !== null}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg text-sm transition-all',
                              quizAnswered === null
                                ? 'bg-background-tertiary/50 hover:bg-background-tertiary text-foreground'
                                : i === generatedQuiz[quizIndex].correctIndex
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                  : quizAnswered === i
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                    : 'bg-background-tertiary/30 text-foreground-muted'
                            )}
                          >
                            <span className="flex items-center gap-2">
                              {quizAnswered !== null && i === generatedQuiz[quizIndex].correctIndex && <Check className="w-4 h-4" />}
                              {quizAnswered !== null && quizAnswered === i && i !== generatedQuiz[quizIndex].correctIndex && <X className="w-4 h-4" />}
                              {String.fromCharCode(65 + i)}. {option}
                            </span>
                          </button>
                        ))}
                      </div>
                      {quizAnswered !== null && (
                        <button
                          onClick={() => {
                            setQuizIndex(qi => qi + 1);
                            setQuizAnswered(null);
                          }}
                          className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          {quizIndex + 1 === generatedQuiz.length ? 'See Results' : 'Next Question'}
                        </button>
                      )}
                    </div>
                  )}

                  {generatedQuiz.length > 0 && quizIndex >= generatedQuiz.length && (
                    <div className="text-center space-y-3 py-4">
                      <div className="text-4xl font-bold text-emerald-500">{quizScore}/{generatedQuiz.length}</div>
                      <p className="text-sm text-foreground-muted">
                        {quizScore === generatedQuiz.length ? '🎉 Perfect score!' :
                          quizScore >= generatedQuiz.length * 0.7 ? '👍 Great job!' :
                            '📚 Keep studying!'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setQuizIndex(0);
                            setQuizScore(0);
                            setQuizAnswered(null);
                          }}
                          className="flex-1 px-4 py-2 bg-background-tertiary hover:bg-background-secondary text-foreground rounded-lg text-sm transition-all"
                        >
                          Retry
                        </button>
                        <button
                          onClick={() => {
                            const note = notes.get(activeNoteId);
                            addQuiz({
                              name: note?.title || 'Quiz',
                              noteId: activeNoteId,
                              noteName: note?.title || null,
                              questions: generatedQuiz
                            });
                            clearGeneratedContent();
                            setMode(null);
                            setQuizIndex(0);
                            setQuizScore(0);
                            setQuizAnswered(null);
                          }}
                          className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          Save Quiz
                        </button>
                      </div>
                    </div>
                  )}

                  {generatedQuiz.length === 0 && !isLoading && (
                    <button
                      onClick={() => generateQuiz(activeNoteId)}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-medium transition-all hover:shadow-lg"
                    >
                      Generate Quiz
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-foreground-muted bg-background-tertiary/50 rounded-lg px-3 py-2.5">
                  AI will generate a 2-3 sentence summary of this note.
                </p>
              )}

              {mode !== 'podcast' && mode !== 'flashcards' && mode !== 'quiz' && (
                <button
                  onClick={handleAction}
                  disabled={(mode !== 'summarize' && !input.trim()) || isLoading}
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
              )}
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
