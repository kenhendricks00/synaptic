import { useMemo } from 'react';
import { useSettingsStore, useVaultStore, useUIStore } from '../stores';
import { Plus, Clock, FileText, Calendar, Sparkles } from 'lucide-react';

function getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
}

function isBirthday(birthday: string): boolean {
    if (!birthday) return false;
    const today = new Date();
    const bday = new Date(birthday);
    return today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate();
}

export function HomeDashboard() {
    const { settings } = useSettingsStore();
    const { noteMetadata, setActiveNote } = useVaultStore();
    const { setCreateNoteModalOpen, setCurrentView } = useUIStore();

    const greeting = getTimeBasedGreeting();
    const userName = settings.userName || 'there';
    const isUserBirthday = isBirthday(settings.userBirthday);

    // Get recent notes (sorted by last modified)
    const recentNotes = useMemo(() => {
        return [...noteMetadata]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 5);
    }, [noteMetadata]);

    const handleOpenNote = (noteId: string) => {
        setActiveNote(noteId);
        setCurrentView('editor');
    };

    const handleNewNote = () => {
        setCreateNoteModalOpen(true);
    };

    const handleOpenDailyNote = () => {
        setCurrentView('daily');
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-background">
            <div className="max-w-2xl w-full text-center space-y-8">
                {/* Greeting */}
                <div className="space-y-2">
                    {isUserBirthday && (
                        <div className="flex items-center justify-center gap-2 text-accent mb-4">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                            <span className="text-lg font-medium">Happy Birthday! 🎂🎉</span>
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                    )}
                    <h1 className="text-4xl font-bold text-foreground">
                        {greeting}, {userName}!
                    </h1>
                    <p className="text-foreground-muted text-lg">
                        What would you like to work on today?
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap justify-center gap-4">
                    <button
                        onClick={handleNewNote}
                        className="flex items-center gap-3 px-6 py-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-all shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 hover:scale-105"
                    >
                        <Plus className="w-5 h-5" />
                        Create New Note
                    </button>
                    <button
                        onClick={handleOpenDailyNote}
                        className="flex items-center gap-3 px-6 py-4 bg-background-secondary hover:bg-background-tertiary border border-border text-foreground-secondary rounded-xl font-medium transition-all hover:border-accent/50 hover:scale-105"
                    >
                        <Calendar className="w-5 h-5" />
                        Today's Daily Note
                    </button>
                </div>

                {/* Recent Notes */}
                {recentNotes.length > 0 && (
                    <div className="mt-8 text-left">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-4">
                            <Clock className="w-4 h-4" />
                            Recent Notes
                        </h2>
                        <div className="space-y-2">
                            {recentNotes.map((note) => (
                                <button
                                    key={note.id}
                                    onClick={() => handleOpenNote(note.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-background-secondary hover:bg-background-tertiary border border-border rounded-lg transition-all text-left group hover:border-accent/50"
                                >
                                    <FileText className="w-4 h-4 text-foreground-muted group-hover:text-accent transition-colors" />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-foreground font-medium truncate block">
                                            {note.title || 'Untitled'}
                                        </span>
                                        <span className="text-xs text-foreground-muted">
                                            {new Date(note.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="flex justify-center gap-8 text-foreground-muted text-sm pt-4 border-t border-border">
                    <span>{noteMetadata.length} notes in vault</span>
                </div>
            </div>
        </div>
    );
}
