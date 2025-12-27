import { useState, useEffect, useCallback } from 'react';
import {
    GraduationCap,
    RotateCcw,
    ThumbsUp,
    ThumbsDown,
    Zap,
    CheckCircle2,
    Flame
} from 'lucide-react';
import { useVaultStore } from '../../stores';
import {
    getDueFlashcards,
    calculateNextReview,
    updateFlashcardInNote,
    type Flashcard,
    type Rating
} from '../../lib/spaced-repetition';

export function FlashcardStudy() {
    const { noteMetadata } = useVaultStore();
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [reviewed, setReviewed] = useState(0);
    const [sessionComplete, setSessionComplete] = useState(false);

    // Load due cards
    const loadCards = useCallback(async () => {
        setIsLoading(true);
        try {
            console.log('[FlashcardStudy] Loading cards for metadata length:', noteMetadata.length);
            const dueCards = await getDueFlashcards(noteMetadata);
            setCards(dueCards);
        } catch (error) {
            console.error('Failed to load flashcards:', error);
        } finally {
            setIsLoading(false);
        }
    }, [noteMetadata]);

    useEffect(() => {
        loadCards();
    }, [loadCards]);

    const currentCard = cards[currentIndex];
    const totalCards = cards.length;

    const handleFlip = useCallback(() => {
        setIsFlipped(!isFlipped);
    }, [isFlipped]);

    const handleRate = useCallback(async (rating: Rating) => {
        if (!currentCard) return;

        const { newEase, newInterval, nextDate } = calculateNextReview(
            currentCard.ease,
            currentCard.interval,
            rating
        );

        // Update the note file with new review data
        try {
            await updateFlashcardInNote(
                currentCard.path,
                currentCard.front,
                newEase,
                newInterval,
                nextDate
            );
        } catch (e) {
            console.error('Failed to update flashcard:', e);
        }

        // Move to next card
        setReviewed(prev => prev + 1);
        setIsFlipped(false);

        if (currentIndex + 1 >= totalCards) {
            setSessionComplete(true);
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    }, [currentCard, currentIndex, totalCards]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (!isFlipped) {
                    handleFlip();
                }
            } else if (isFlipped) {
                switch (e.key) {
                    case '1':
                        handleRate('again');
                        break;
                    case '2':
                        handleRate('hard');
                        break;
                    case '3':
                        handleRate('good');
                        break;
                    case '4':
                        handleRate('easy');
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlipped, handleFlip, handleRate]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background pt-20">
                <div className="text-center">
                    <GraduationCap className="w-16 h-16 text-accent mx-auto mb-4 animate-pulse" />
                    <p className="text-foreground-secondary">Loading flashcards...</p>
                </div>
            </div>
        );
    }

    if (totalCards === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background pt-20">
                <div className="text-center max-w-md">
                    <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-foreground mb-2">All caught up!</h1>
                    <p className="text-foreground-secondary mb-6">
                        No flashcards due for review today. Create new flashcards using Ctrl+K → "Flashcard: Create New"
                    </p>
                    <button
                        onClick={loadCards}
                        className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-all shadow-lg shadow-accent/25 flex items-center gap-2 mx-auto"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Check for new cards
                    </button>
                </div>
            </div>
        );
    }

    if (sessionComplete) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background pt-20">
                <div className="text-center max-w-md">
                    <div className="relative mb-6">
                        <Flame className="w-20 h-20 text-orange-500 mx-auto animate-bounce" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Session Complete! 🎉</h1>
                    <p className="text-foreground-secondary mb-4">
                        You reviewed <span className="text-accent font-bold">{reviewed}</span> cards
                    </p>
                    <button
                        onClick={() => {
                            setCurrentIndex(0);
                            setReviewed(0);
                            setSessionComplete(false);
                            setIsFlipped(false);
                        }}
                        className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors"
                    >
                        Review Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-background h-full overflow-auto">
            <div className="flex-1 flex flex-col pt-8 pb-6 px-6 max-w-3xl mx-auto w-full">
                {/* Header / Progress */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <GraduationCap className="w-6 h-6 text-accent" />
                            <span className="font-semibold text-foreground">Study Session</span>
                        </div>
                        <div className="text-sm text-foreground-secondary">
                            <span className="text-accent font-bold">{currentIndex + 1}</span>
                            <span className="text-foreground-muted"> / {totalCards}</span>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-accent to-purple-500 transition-all duration-300"
                            style={{ width: `${((currentIndex) / totalCards) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Flashcard */}
                <div className="flex-1 flex items-center justify-center pb-24">
                    <div
                        onClick={handleFlip}
                        className="relative w-full max-w-xl aspect-[4/3] cursor-pointer perspective-1000"
                    >
                        <div
                            className={`absolute inset-0 transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''
                                }`}
                        >
                            {/* Front of card */}
                            <div className={`absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-background-secondary to-background-tertiary border border-border p-8 flex flex-col items-center justify-center ${isFlipped ? 'invisible' : ''}`}>
                                <span className="text-xs uppercase tracking-widest text-foreground-muted mb-4">Question</span>
                                <p className="text-2xl font-medium text-foreground text-center">
                                    {currentCard?.front}
                                </p>
                                <p className="text-sm text-foreground-muted mt-6">
                                    Click or press Space to reveal
                                </p>
                            </div>

                            {/* Back of card */}
                            <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-gradient-to-br from-accent/10 to-purple-900/20 border border-accent/30 p-8 flex flex-col items-center justify-center ${!isFlipped ? 'invisible' : ''}`}>
                                <span className="text-xs uppercase tracking-widest text-accent mb-4">Answer</span>
                                <p className="text-2xl font-medium text-foreground text-center">
                                    {currentCard?.back}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rating buttons (only visible when flipped) */}
                {isFlipped && (
                    <div className="fixed bottom-8 left-0 right-0 flex justify-center">
                        <div className="flex gap-3 bg-background-secondary/90 backdrop-blur-sm border border-border rounded-2xl p-3">
                            <RatingButton
                                label="Again"
                                shortcut="1"
                                color="red"
                                icon={RotateCcw}
                                onClick={() => handleRate('again')}
                            />
                            <RatingButton
                                label="Hard"
                                shortcut="2"
                                color="orange"
                                icon={ThumbsDown}
                                onClick={() => handleRate('hard')}
                            />
                            <RatingButton
                                label="Good"
                                shortcut="3"
                                color="green"
                                icon={ThumbsUp}
                                onClick={() => handleRate('good')}
                            />
                            <RatingButton
                                label="Easy"
                                shortcut="4"
                                color="blue"
                                icon={Zap}
                                onClick={() => handleRate('easy')}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function RatingButton({
    label,
    shortcut,
    color,
    icon: Icon,
    onClick
}: {
    label: string;
    shortcut: string;
    color: 'red' | 'orange' | 'green' | 'blue';
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
}) {
    const colorClasses = {
        red: 'hover:bg-red-500/20 hover:border-red-500 text-red-400',
        orange: 'hover:bg-orange-500/20 hover:border-orange-500 text-orange-400',
        green: 'hover:bg-green-500/20 hover:border-green-500 text-green-400',
        blue: 'hover:bg-blue-500/20 hover:border-blue-500 text-blue-400',
    };

    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 px-6 py-3 rounded-xl border border-border bg-background-tertiary transition-all ${colorClasses[color]}`}
        >
            <Icon className="w-5 h-5" />
            <span className="text-sm font-medium text-foreground">{label}</span>
            <kbd className="text-2xs text-foreground-muted">{shortcut}</kbd>
        </button>
    );
}

export default FlashcardStudy;
