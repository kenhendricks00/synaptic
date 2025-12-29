import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface FlashcardDeck {
    id: string;
    name: string;
    noteId: string | null;
    noteName: string | null;
    cards: Array<{
        front: string;
        back: string;
        ease: number;
        interval: number;
        nextReview: string; // ISO date string
    }>;
    createdAt: string;
}

export interface SavedQuiz {
    id: string;
    name: string;
    noteId: string | null;
    noteName: string | null;
    questions: Array<{
        question: string;
        options: string[];
        correctIndex: number;
    }>;
    bestScore: number;
    attempts: number;
    createdAt: string;
}

export interface SavedPodcast {
    id: string;
    name: string;
    noteId: string | null;
    noteName: string | null;
    segments: Array<{
        speaker: string;
        text: string;
        voiceId: string;
    }>;
    createdAt: string;
}

interface LearningStore {
    decks: FlashcardDeck[];
    quizzes: SavedQuiz[];
    podcasts: SavedPodcast[];

    // Deck methods
    addDeck: (deck: Omit<FlashcardDeck, 'id' | 'createdAt'>) => string;
    updateDeck: (id: string, updates: Partial<FlashcardDeck>) => void;
    deleteDeck: (id: string) => void;
    getDeck: (id: string) => FlashcardDeck | undefined;

    // Quiz methods
    addQuiz: (quiz: Omit<SavedQuiz, 'id' | 'createdAt' | 'bestScore' | 'attempts'>) => string;
    updateQuiz: (id: string, updates: Partial<SavedQuiz>) => void;
    deleteQuiz: (id: string) => void;
    getQuiz: (id: string) => SavedQuiz | undefined;
    recordQuizAttempt: (id: string, score: number) => void;

    // Podcast methods
    addPodcast: (podcast: Omit<SavedPodcast, 'id' | 'createdAt'>) => string;
    deletePodcast: (id: string) => void;
    getPodcast: (id: string) => SavedPodcast | undefined;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useLearningStore = create<LearningStore>()(
    persist(
        (set, get) => ({
            decks: [],
            quizzes: [],
            podcasts: [],

            // Deck methods
            addDeck: (deck) => {
                const id = generateId();
                set((state) => ({
                    decks: [...state.decks, {
                        ...deck,
                        id,
                        createdAt: new Date().toISOString()
                    }]
                }));
                return id;
            },

            updateDeck: (id, updates) => {
                set((state) => ({
                    decks: state.decks.map(d => d.id === id ? { ...d, ...updates } : d)
                }));
            },

            deleteDeck: (id) => {
                set((state) => ({
                    decks: state.decks.filter(d => d.id !== id)
                }));
            },

            getDeck: (id) => get().decks.find(d => d.id === id),

            // Quiz methods
            addQuiz: (quiz) => {
                const id = generateId();
                set((state) => ({
                    quizzes: [...state.quizzes, {
                        ...quiz,
                        id,
                        bestScore: 0,
                        attempts: 0,
                        createdAt: new Date().toISOString()
                    }]
                }));
                return id;
            },

            updateQuiz: (id, updates) => {
                set((state) => ({
                    quizzes: state.quizzes.map(q => q.id === id ? { ...q, ...updates } : q)
                }));
            },

            deleteQuiz: (id) => {
                set((state) => ({
                    quizzes: state.quizzes.filter(q => q.id !== id)
                }));
            },

            getQuiz: (id) => get().quizzes.find(q => q.id === id),

            recordQuizAttempt: (id, score) => {
                set((state) => ({
                    quizzes: state.quizzes.map(q => {
                        if (q.id !== id) return q;
                        return {
                            ...q,
                            attempts: q.attempts + 1,
                            bestScore: Math.max(q.bestScore, score)
                        };
                    })
                }));
            },

            // Podcast methods
            addPodcast: (podcast) => {
                const id = generateId();
                set((state) => ({
                    podcasts: [...state.podcasts, {
                        ...podcast,
                        id,
                        createdAt: new Date().toISOString()
                    }]
                }));
                return id;
            },

            deletePodcast: (id) => {
                set((state) => ({
                    podcasts: state.podcasts.filter(p => p.id !== id)
                }));
            },

            getPodcast: (id) => get().podcasts.find(p => p.id === id)
        }),
        {
            name: 'synaptic-learning-storage'
        }
    )
);
