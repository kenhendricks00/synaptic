import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../../../lib';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  nextReview: number;
  interval: number;
  easeFactor: number;
  reviews: number;
}

export function SpacedRepetitionView() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCard, setNewCard] = useState({ question: '', answer: '' });
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    const now = Date.now();
    const due = cards.filter(card => card.nextReview <= now);
    setDueCards(due);
    if (due.length > 0) {
      setCurrentCard(due[0]);
    }
  }, [cards]);

  const loadCards = () => {
    const stored = localStorage.getItem('spaced-repetition-cards');
    if (stored) {
      setCards(JSON.parse(stored));
    }
  };

  const saveCards = (updatedCards: Flashcard[]) => {
    setCards(updatedCards);
    localStorage.setItem('spaced-repetition-cards', JSON.stringify(updatedCards));
  };

  const createCard = () => {
    if (!newCard.question.trim() || !newCard.answer.trim()) return;

    const card: Flashcard = {
      id: crypto.randomUUID(),
      question: newCard.question,
      answer: newCard.answer,
      nextReview: Date.now(),
      interval: 1,
      easeFactor: 2.5,
      reviews: 0,
    };

    saveCards([...cards, card]);
    setNewCard({ question: '', answer: '' });
    setIsCreating(false);
  };

  const deleteCard = (id: string) => {
    saveCards(cards.filter(card => card.id !== id));
    if (currentCard?.id === id) {
      setCurrentCard(null);
      setShowAnswer(false);
    }
  };

  const handleReview = (quality: number) => {
    if (!currentCard) return;

    // SM-2 Algorithm
    const card = currentCard;
    let { interval, easeFactor, reviews } = card;

    reviews++;
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    if (quality < 3) {
      interval = 1;
    } else if (reviews === 1) {
      interval = 1;
    } else if (reviews === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;

    const updatedCards = cards.map(c =>
      c.id === card.id
        ? { ...c, interval, easeFactor, reviews, nextReview }
        : c
    );

    saveCards(updatedCards);

    // Move to next card
    const remaining = dueCards.filter(c => c.id !== card.id);
    setDueCards(remaining);
    setCurrentCard(remaining[0] || null);
    setShowAnswer(false);
  };

  const stats = {
    total: cards.length,
    due: dueCards.length,
    reviewed: cards.filter(c => c.reviews > 0).length,
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background-secondary/50 backdrop-blur p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Spaced Repetition</h2>
            <div className="flex items-center gap-4 text-sm text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {stats.due} cards due
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                {stats.reviewed} reviewed
              </span>
              <span>{stats.total} total</span>
            </div>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-accent/25"
          >
            <Plus className="w-4 h-4" />
            Create Card
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isCreating ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-background-secondary to-background border border-border rounded-2xl p-6">
              <h3 className="font-semibold text-foreground mb-4">Create Flashcard</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Question</label>
                  <textarea
                    value={newCard.question}
                    onChange={(e) => setNewCard({ ...newCard, question: e.target.value })}
                    placeholder="Enter your question..."
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-foreground-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Answer</label>
                  <textarea
                    value={newCard.answer}
                    onChange={(e) => setNewCard({ ...newCard, answer: e.target.value })}
                    placeholder="Enter the answer..."
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-foreground-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 bg-background-tertiary hover:bg-background-tertiary/80 text-foreground-secondary rounded-lg text-sm font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createCard}
                    disabled={!newCard.question.trim() || !newCard.answer.trim()}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-accent/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Card
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : currentCard ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-background-secondary to-background border border-border rounded-2xl p-8">
              <div className="mb-6">
                <span className="text-xs text-foreground-muted font-medium">
                  Card {dueCards.indexOf(currentCard) + 1} of {dueCards.length}
                </span>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-medium text-foreground mb-6">Question</h3>
                <p className="text-foreground leading-relaxed text-lg">{currentCard.question}</p>
              </div>

              {showAnswer ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">Answer</h3>
                    <p className="text-foreground leading-relaxed text-lg">{currentCard.answer}</p>
                  </div>

                  <div className="pt-6 border-t border-border">
                    <p className="text-sm text-foreground-muted mb-4 text-center">How well did you know this?</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Again', quality: 1, color: 'bg-red-500/10 text-red-400 hover:bg-red-500/20' },
                        { label: 'Hard', quality: 3, color: 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' },
                        { label: 'Good', quality: 4, color: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' },
                        { label: 'Easy', quality: 5, color: 'bg-green-500/10 text-green-400 hover:bg-green-500/20' },
                      ].map((option) => (
                        <button
                          key={option.label}
                          onClick={() => handleReview(option.quality)}
                          className={cn(
                            'px-4 py-3 rounded-xl text-sm font-medium transition-all hover:shadow-md',
                            option.color
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="w-full px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-medium transition-all hover:shadow-lg hover:shadow-accent/25"
                >
                  Show Answer
                </button>
              )}

              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-xs text-foreground-muted">
                <span>Reviews: {currentCard.reviews}</span>
                <button
                  onClick={() => deleteCard(currentCard.id)}
                  className="flex items-center gap-1 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">All caught up!</h3>
            <p className="text-sm text-foreground-muted max-w-md">
              No cards due for review. Create new flashcards or come back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
