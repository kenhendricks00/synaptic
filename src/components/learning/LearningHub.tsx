import { useState, useRef } from 'react';
import {
    GraduationCap,
    Layers,
    HelpCircle,
    Radio,
    Trash2,
    Play,
    Pause,
    Square,
    SkipBack,
    SkipForward,
    Clock,
    Target
} from 'lucide-react';
import { useLearningStore } from '../../stores';
import { cn } from '../../lib';
import { kokoroService } from '../../lib/kokoro';

type Tab = 'decks' | 'quizzes' | 'podcasts';

export function LearningHub() {
    const [activeTab, setActiveTab] = useState<Tab>('decks');
    const { decks, quizzes, podcasts, deleteDeck, deleteQuiz, deletePodcast } = useLearningStore();
    const [studyingDeckId, setStudyingDeckId] = useState<string | null>(null);
    const [takingQuizId, setTakingQuizId] = useState<string | null>(null);
    const [quizIndex, setQuizIndex] = useState(0);
    const [quizScore, setQuizScore] = useState(0);
    const [quizAnswered, setQuizAnswered] = useState<number | null>(null);
    const [cardFlipped, setCardFlipped] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);

    // Podcast player state
    const [playingPodcastId, setPlayingPodcastId] = useState<string | null>(null);
    const [podcastSegmentIndex, setPodcastSegmentIndex] = useState(0);
    const [podcastCurrentText, setPodcastCurrentText] = useState('');
    const [podcastIsPlaying, setPodcastIsPlaying] = useState(false);
    const [podcastIsPaused, setPodcastIsPaused] = useState(false);
    const podcastAbortRef = useRef(false);

    const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
        { id: 'decks', label: 'Flashcard Decks', icon: <Layers className="w-4 h-4" />, count: decks.length },
        { id: 'quizzes', label: 'Quizzes', icon: <HelpCircle className="w-4 h-4" />, count: quizzes.length },
        { id: 'podcasts', label: 'Podcasts', icon: <Radio className="w-4 h-4" />, count: podcasts.length }
    ];

    // Studying a deck
    if (studyingDeckId) {
        const deck = decks.find(d => d.id === studyingDeckId);
        if (!deck) {
            setStudyingDeckId(null);
            return null;
        }

        const card = deck.cards[currentCardIndex];

        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-xl space-y-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => {
                                setStudyingDeckId(null);
                                setCurrentCardIndex(0);
                                setCardFlipped(false);
                            }}
                            className="text-sm text-foreground-muted hover:text-foreground"
                        >
                            ← Back to Decks
                        </button>
                        <span className="text-sm text-foreground-muted">
                            Card {currentCardIndex + 1} of {deck.cards.length}
                        </span>
                    </div>

                    <div
                        onClick={() => setCardFlipped(!cardFlipped)}
                        className="min-h-64 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-8 cursor-pointer hover:border-amber-500/40 transition-all"
                    >
                        <p className="text-xs text-amber-500 mb-2">{cardFlipped ? 'ANSWER' : 'QUESTION'}</p>
                        <p className="text-lg text-foreground">
                            {cardFlipped ? card.back : card.front}
                        </p>
                        {!cardFlipped && (
                            <p className="text-xs text-foreground-muted mt-4">Click to reveal answer</p>
                        )}
                    </div>

                    {cardFlipped && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (currentCardIndex < deck.cards.length - 1) {
                                        setCurrentCardIndex(i => i + 1);
                                        setCardFlipped(false);
                                    } else {
                                        setStudyingDeckId(null);
                                        setCurrentCardIndex(0);
                                        setCardFlipped(false);
                                    }
                                }}
                                className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all"
                            >
                                {currentCardIndex < deck.cards.length - 1 ? 'Next Card' : 'Finish'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Taking a quiz
    if (takingQuizId) {
        const quiz = quizzes.find(q => q.id === takingQuizId);
        if (!quiz) {
            setTakingQuizId(null);
            return null;
        }

        // Quiz complete
        if (quizIndex >= quiz.questions.length) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-center space-y-4">
                        <div className="text-6xl font-bold text-emerald-500">{quizScore}/{quiz.questions.length}</div>
                        <p className="text-lg text-foreground-muted">
                            {quizScore === quiz.questions.length ? '🎉 Perfect score!' :
                                quizScore >= quiz.questions.length * 0.7 ? '👍 Great job!' :
                                    '📚 Keep studying!'}
                        </p>
                        <button
                            onClick={() => {
                                setTakingQuizId(null);
                                setQuizIndex(0);
                                setQuizScore(0);
                                setQuizAnswered(null);
                            }}
                            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all"
                        >
                            Done
                        </button>
                    </div>
                </div>
            );
        }

        const question = quiz.questions[quizIndex];

        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-xl space-y-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => {
                                setTakingQuizId(null);
                                setQuizIndex(0);
                                setQuizScore(0);
                                setQuizAnswered(null);
                            }}
                            className="text-sm text-foreground-muted hover:text-foreground"
                        >
                            ← Back to Quizzes
                        </button>
                        <span className="text-sm text-foreground-muted">
                            Question {quizIndex + 1} of {quiz.questions.length} • Score: {quizScore}
                        </span>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 space-y-4">
                        <p className="text-lg font-medium text-foreground">{question.question}</p>
                        <div className="space-y-2">
                            {question.options.map((option, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        if (quizAnswered !== null) return;
                                        setQuizAnswered(i);
                                        if (i === question.correctIndex) {
                                            setQuizScore(s => s + 1);
                                        }
                                    }}
                                    disabled={quizAnswered !== null}
                                    className={cn(
                                        'w-full text-left px-4 py-3 rounded-xl text-sm transition-all',
                                        quizAnswered === null
                                            ? 'bg-background hover:bg-background-tertiary text-foreground'
                                            : i === question.correctIndex
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                                : quizAnswered === i
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                                    : 'bg-background-tertiary/30 text-foreground-muted'
                                    )}
                                >
                                    {String.fromCharCode(65 + i)}. {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    {quizAnswered !== null && (
                        <button
                            onClick={() => {
                                setQuizIndex(qi => qi + 1);
                                setQuizAnswered(null);
                            }}
                            className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all"
                        >
                            {quizIndex + 1 === quiz.questions.length ? 'See Results' : 'Next Question'}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Playing a podcast
    if (playingPodcastId) {
        const podcast = podcasts.find(p => p.id === playingPodcastId);
        if (!podcast) {
            setPlayingPodcastId(null);
            return null;
        }

        const currentSegment = podcast.segments[podcastSegmentIndex];
        const progress = podcast.segments.length > 0 ? ((podcastSegmentIndex) / podcast.segments.length) * 100 : 0;

        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-xl space-y-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => {
                                podcastAbortRef.current = true;
                                kokoroService.stop();
                                setPlayingPodcastId(null);
                                setPodcastSegmentIndex(0);
                                setPodcastIsPlaying(false);
                                setPodcastIsPaused(false);
                            }}
                            className="text-sm text-foreground-muted hover:text-foreground"
                        >
                            ← Back to Podcasts
                        </button>
                        <span className="text-sm text-foreground-muted">
                            Segment {podcastSegmentIndex + 1} of {podcast.segments.length}
                        </span>
                    </div>

                    {/* Player Card */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 space-y-4">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-foreground">{podcast.name}</h3>
                            {currentSegment && (
                                <p className="text-sm text-purple-400 mt-1">{currentSegment.speaker}</p>
                            )}
                        </div>

                        {/* Current Text */}
                        <div className="bg-background/50 rounded-xl p-4 min-h-24">
                            <p className="text-sm text-foreground-secondary text-center">
                                {podcastCurrentText || currentSegment?.text || '...'}
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="h-1.5 bg-background rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            {/* Segment dots */}
                            <div className="flex justify-between px-1">
                                {podcast.segments.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            kokoroService.stop();
                                            setPodcastSegmentIndex(i);
                                            setPodcastIsPlaying(false);
                                        }}
                                        className={cn(
                                            'w-2 h-2 rounded-full transition-all',
                                            i <= podcastSegmentIndex ? 'bg-purple-500' : 'bg-background-tertiary',
                                            i === podcastSegmentIndex && 'ring-2 ring-purple-500/50'
                                        )}
                                        title={`Segment ${i + 1}: ${podcast.segments[i].speaker}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => {
                                    if (podcastSegmentIndex > 0) {
                                        kokoroService.stop();
                                        setPodcastSegmentIndex(i => i - 1);
                                        setPodcastIsPlaying(false);
                                    }
                                }}
                                disabled={podcastSegmentIndex === 0}
                                className="p-3 rounded-xl bg-background hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-all disabled:opacity-30"
                            >
                                <SkipBack className="w-5 h-5" />
                            </button>

                            <button
                                onClick={async () => {
                                    if (podcastIsPlaying && !podcastIsPaused) {
                                        kokoroService.pause();
                                        setPodcastIsPaused(true);
                                    } else if (podcastIsPaused) {
                                        kokoroService.resume();
                                        setPodcastIsPaused(false);
                                    } else {
                                        // Start playing from current segment
                                        setPodcastIsPlaying(true);
                                        setPodcastIsPaused(false);
                                        podcastAbortRef.current = false;

                                        const segmentsToPlay = podcast.segments.slice(podcastSegmentIndex);
                                        await kokoroService.speakSegments(
                                            segmentsToPlay.map(s => ({ voiceId: s.voiceId, text: s.text })),
                                            (index, text) => {
                                                setPodcastSegmentIndex(podcastSegmentIndex + index);
                                                setPodcastCurrentText(text);
                                            },
                                            () => {
                                                setPodcastIsPlaying(false);
                                            }
                                        );
                                    }
                                }}
                                className="p-4 rounded-xl bg-purple-500 hover:bg-purple-600 text-white transition-all"
                            >
                                {podcastIsPlaying && !podcastIsPaused ? (
                                    <Pause className="w-6 h-6" />
                                ) : (
                                    <Play className="w-6 h-6" />
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    kokoroService.stop();
                                    setPodcastIsPlaying(false);
                                    setPodcastIsPaused(false);
                                    setPodcastSegmentIndex(0);
                                }}
                                className="p-3 rounded-xl bg-background hover:bg-red-500/20 text-foreground-muted hover:text-red-400 transition-all"
                            >
                                <Square className="w-5 h-5" />
                            </button>

                            <button
                                onClick={() => {
                                    if (podcastSegmentIndex < podcast.segments.length - 1) {
                                        kokoroService.stop();
                                        setPodcastSegmentIndex(i => i + 1);
                                        setPodcastIsPlaying(false);
                                    }
                                }}
                                disabled={podcastSegmentIndex >= podcast.segments.length - 1}
                                className="p-3 rounded-xl bg-background hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-all disabled:opacity-30"
                            >
                                <SkipForward className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-accent/20 to-accent/5 rounded-xl">
                        <GraduationCap className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">Learning Hub</h1>
                        <p className="text-sm text-foreground-muted">Your saved flashcards, quizzes, and podcasts</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                                activeTab === tab.id
                                    ? 'bg-accent text-white'
                                    : 'bg-background-tertiary/50 text-foreground-muted hover:bg-background-tertiary hover:text-foreground'
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">{tab.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'decks' && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {decks.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-foreground-muted">
                                <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No flashcard decks yet</p>
                                <p className="text-sm">Generate flashcards from a note to get started</p>
                            </div>
                        ) : decks.map(deck => (
                            <div key={deck.id} className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 hover:border-amber-500/40 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-medium text-foreground">{deck.name}</h3>
                                        {deck.noteName && (
                                            <p className="text-xs text-foreground-muted">From: {deck.noteName}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => deleteDeck(deck.id)}
                                        className="p-1.5 text-foreground-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-foreground-muted mb-4">
                                    <span className="flex items-center gap-1">
                                        <Layers className="w-3 h-3" />
                                        {deck.cards.length} cards
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(deck.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setStudyingDeckId(deck.id);
                                        setCurrentCardIndex(0);
                                        setCardFlipped(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-all"
                                >
                                    <Play className="w-4 h-4" />
                                    Study Now
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'quizzes' && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {quizzes.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-foreground-muted">
                                <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No quizzes yet</p>
                                <p className="text-sm">Generate a quiz from a note to get started</p>
                            </div>
                        ) : quizzes.map(quiz => (
                            <div key={quiz.id} className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-4 hover:border-emerald-500/40 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-medium text-foreground">{quiz.name}</h3>
                                        {quiz.noteName && (
                                            <p className="text-xs text-foreground-muted">From: {quiz.noteName}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => deleteQuiz(quiz.id)}
                                        className="p-1.5 text-foreground-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-foreground-muted mb-4">
                                    <span className="flex items-center gap-1">
                                        <HelpCircle className="w-3 h-3" />
                                        {quiz.questions.length} questions
                                    </span>
                                    {quiz.attempts > 0 && (
                                        <span className="flex items-center gap-1 text-emerald-500">
                                            <Target className="w-3 h-3" />
                                            Best: {quiz.bestScore}/{quiz.questions.length}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        setTakingQuizId(quiz.id);
                                        setQuizIndex(0);
                                        setQuizScore(0);
                                        setQuizAnswered(null);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-all"
                                >
                                    <Play className="w-4 h-4" />
                                    Take Quiz
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'podcasts' && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {podcasts.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-foreground-muted">
                                <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No podcasts yet</p>
                                <p className="text-sm">Generate a podcast from a note to get started</p>
                            </div>
                        ) : podcasts.map(podcast => (
                            <div key={podcast.id} className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-4 hover:border-purple-500/40 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-medium text-foreground">{podcast.name}</h3>
                                        {podcast.noteName && (
                                            <p className="text-xs text-foreground-muted">From: {podcast.noteName}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => deletePodcast(podcast.id)}
                                        className="p-1.5 text-foreground-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-foreground-muted mb-4">
                                    <span className="flex items-center gap-1">
                                        <Radio className="w-3 h-3" />
                                        {podcast.segments.length} segments
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(podcast.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setPlayingPodcastId(podcast.id);
                                        setPodcastSegmentIndex(0);
                                        setPodcastCurrentText('');
                                        setPodcastIsPlaying(false);
                                        setPodcastIsPaused(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-all"
                                >
                                    <Play className="w-4 h-4" />
                                    Play Podcast
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
