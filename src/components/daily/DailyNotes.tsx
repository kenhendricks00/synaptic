import { useState, useEffect } from 'react';
import { Calendar, CloudRain, Smile, Meh, Frown, Heart } from 'lucide-react';
import { useVaultStore, useSettingsStore, usePluginStore } from '../../stores';
import { saveNote, getGreeting, cn } from '../../lib';
import { NoteEditor } from '../editor';
import type { Note } from '../../types';
import type { TemplaterPluginInterface } from '../../plugins/built-in/templater';

type Mood = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

interface MoodOption {
    value: Mood;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}

const moodOptions: MoodOption[] = [
    { value: 'great', label: 'Great', icon: Heart, color: 'text-pink-500' },
    { value: 'good', label: 'Good', icon: Smile, color: 'text-green-500' },
    { value: 'okay', label: 'Okay', icon: Meh, color: 'text-yellow-500' },
    { value: 'bad', label: 'Bad', icon: Frown, color: 'text-orange-500' },
    { value: 'terrible', label: 'Terrible', icon: CloudRain, color: 'text-red-500' },
];

export function DailyNotes() {
    const { currentVault, addNote, updateNote, setActiveNote, activeNoteId } = useVaultStore();
    const { settings } = useSettingsStore();
    const [dailyNote, setDailyNote] = useState<Note | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

    // Load or create today's daily note
    useEffect(() => {
        if (!currentVault) return;

        const loadDailyNote = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const today = new Date();

                // Templater check and content generation
                const templater = usePluginStore.getState().installed.get('templater');
                let initialContent = undefined;

                if (templater?.enabled) {
                    try {
                        const plugin = templater.plugin as TemplaterPluginInterface;
                        if (plugin.generateTemplate) {
                            initialContent = await plugin.generateTemplate(today);
                        }
                    } catch (err) {
                        console.error('Templater failed in DailyNotes, using default:', err);
                    }
                }

                // getOrCreateDailyNote handles checking existence, creating folders, and writing if needed
                const { getOrCreateDailyNote } = await import('../../lib');
                const note = await getOrCreateDailyNote(
                    currentVault.path,
                    settings.dailyNotesFolder,
                    initialContent
                );

                setDailyNote(note);
                addNote(note);
                setActiveNote(note.id);

                // Extract mood from note if present
                if (note.mood) {
                    setSelectedMood(note.mood);
                }
            } catch (err) {
                console.error('Failed to load daily note:', err);
                setError(err instanceof Error ? err.message : 'Failed to load daily note');
            } finally {
                setIsLoading(false);
            }
        };

        loadDailyNote();
    }, [currentVault, settings.dailyNotesFolder]);

    const handleMoodSelect = async (mood: Mood) => {
        setSelectedMood(mood);

        if (dailyNote) {
            // Update the note with mood
            updateNote(dailyNote.id, { mood });

            // Optionally add mood to the note content
            if (!dailyNote.content.includes('## Mood')) {
                const moodOption = moodOptions.find((m) => m.value === mood);
                const newContent = dailyNote.content.replace(
                    /^(# .+\n\n)/,
                    `$1## Mood: ${moodOption?.label || mood}\n\n`
                );
                updateNote(dailyNote.id, { content: newContent, mood });
                try {
                    await saveNote({ ...dailyNote, content: newContent });
                } catch (err) {
                    console.error('Failed to save mood:', err);
                }
            }
        }
    };

    if (!currentVault) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Calendar className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
                    <p className="text-foreground-muted text-lg mb-2">Open a vault to use Daily Notes</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-foreground-secondary">Loading today's note...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-error mb-2">Error</p>
                    <p className="text-foreground-muted text-sm">{error}</p>
                </div>
            </div>
        );
    }

    const greeting = getGreeting();
    const today = new Date();

    return (
        <div className="flex flex-col h-full">
            {/* Header with Glassmorphism */}
            <div className="px-8 py-6 border-b border-border/50 backdrop-blur-sm">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shadow-lg shadow-accent/10 backdrop-blur-xl border border-accent/20">
                            <Calendar className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                                {greeting}
                            </h1>
                            <p className="text-sm text-foreground-muted/80">
                                {today.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Glassmorphism Mood Tracker */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground-secondary mr-3">How are you feeling today?</span>
                        <div className="flex gap-2">
                            {moodOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleMoodSelect(option.value)}
                                    className={cn(
                                        'p-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105',
                                        selectedMood === option.value
                                            ? `bg-gradient-to-br ${option.color} text-white shadow-xl scale-105`
                                            : 'bg-white/50 backdrop-blur-xl text-foreground hover:bg-white/80 border border-white/20 hover:border-white/40'
                                    )}
                                    title={option.label}
                                >
                                    <option.icon className="w-5 h-5" />
                                </button>
                            ))}
                        </div>
                        {selectedMood && (
                            <span className="text-sm font-semibold text-foreground-secondary ml-3 animate-fade-in">
                                Feeling {selectedMood}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden bg-gradient-to-b from-background via-background/30 to-background-secondary">
                {dailyNote && activeNoteId === dailyNote.id ? (
                    <NoteEditor />
                ) : (
                    <div className="flex items-center justify-center h-full text-foreground-muted">
                        Loading editor...
                    </div>
                )}
            </div>
        </div>
    );
}
