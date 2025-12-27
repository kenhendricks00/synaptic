import { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib';
import { useVaultStore, useUIStore, usePluginStore } from '../../../stores';
import { loadNote, createNote } from '../../../lib';
import type { TemplaterPluginInterface } from '../templater';

export function CalendarWidget() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const { currentVault, addNote } = useVaultStore();
    const { setCurrentView } = useUIStore();

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const handleDateClick = async (date: Date) => {
        if (!currentVault) return;

        const formattedDate = format(date, 'yyyy-MM-dd');
        const dailyPath = `${currentVault.path}/daily/${formattedDate}.md`;
        const dailyFolder = `${currentVault.path}/daily`;

        // Templater logic
        const templater = usePluginStore.getState().installed.get('templater');
        let content = `# Daily Note: ${formattedDate}\n\n## Tasks\n- [ ] \n\n## Notes\n`; // Default

        if (templater?.enabled) {
            try {
                const plugin = templater.plugin as TemplaterPluginInterface;
                if (plugin.generateTemplate) {
                    content = await plugin.generateTemplate(date);
                }
            } catch (err) {
                console.error('Templater failed, using default:', err);
            }
        }

        try {
            // Try to load existing note
            let note;
            try {
                note = await loadNote(dailyPath);
            } catch (e) {
                // Create new note
                // We ensure the note is created in the daily folder
                // formatting the date as the title handling the .md extension inside createNote
                note = await createNote(dailyFolder, formattedDate, content);
            }

            // Add to store and open
            addNote(note);

            // We need to set the ACTIVE note ID to this new note
            // The store's "addNote" doesn't automatically setActive
            useVaultStore.setState({ activeNoteId: note.id });

            // Switch view to editor
            setCurrentView('editor');

        } catch (error) {
            console.error('Failed to open daily note:', error);
            // alert('Failed to open daily note. Ensure the "daily" folder exists.');
        }
    };

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
        <div className="p-3 border-b border-border">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">
                    {format(currentDate, 'MMMM yyyy')}
                </h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handlePrevMonth}
                        className="p-1 rounded hover:bg-background-tertiary text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-1 rounded hover:bg-background-tertiary text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 mb-1 text-center">
                {weekDays.map(day => (
                    <div key={day} className="text-2xs text-foreground-muted font-medium py-1">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
                {days.map(day => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => handleDateClick(day)}
                            className={cn(
                                "h-7 w-7 mx-auto flex items-center justify-center rounded-full text-xs transition-colors relative",
                                !isCurrentMonth && "text-foreground-muted/30",
                                isCurrentMonth && "text-foreground-secondary hover:bg-background-tertiary hover:text-foreground",
                                isToday && "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground font-semibold"
                            )}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
