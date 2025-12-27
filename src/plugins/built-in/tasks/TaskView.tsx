import { useState, useEffect } from 'react';
import { CheckSquare, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { useVaultStore, useUIStore } from '../../../stores';
import { searchNotes, loadNote, cn } from '../../../lib';

interface Task {
    id: string; // Composite ID: path + line
    content: string;
    isCompleted: boolean;
    filePath: string; // Absolute path
    fileName: string; // Basename
    lineNumber: number;
}

export function TaskView() {
    const { currentVault, setActiveNote, addNote } = useVaultStore();
    const { setCurrentView } = useUIStore();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!currentVault) return;

        const fetchTasks = async () => {
            setIsLoading(true);
            try {
                // 1. Find all notes containing "#task"
                const results = await searchNotes(currentVault.path, '#task');

                const allTasks: Task[] = [];

                // 2. Load content and parse
                // Note: For a large vault, this parallel loading might be heavy. 
                // In a production app, we'd want a dedicated "task indexer" backend.
                await Promise.all(results.map(async (meta) => {
                    try {
                        const note = await loadNote(meta.path);
                        const lines = note.content.split('\n');

                        lines.forEach((line, index) => {
                            // Regex: matches "- [ ]" or "- [x]" followed by text containing "#task"
                            // Capture group 1: " " or "x"
                            // Capture group 2: content
                            const match = line.match(/^[\s]*-\s*\[([ x])\]\s*(.*#task.*)$/i);

                            if (match) {
                                allTasks.push({
                                    id: `${meta.path}:${index}`,
                                    isCompleted: match[1].toLowerCase() === 'x',
                                    content: match[2].replace('#task', '').trim(), // Remove the tag for display cleanliness
                                    filePath: meta.path,
                                    fileName: meta.title || meta.path.split('/').pop() || 'Untitled',
                                    lineNumber: index
                                });
                            }
                        });
                    } catch (e) {
                        console.error(`Failed to load note for tasks: ${meta.path}`, e);
                    }
                }));

                // Sort: Incomplete first, then by filename
                allTasks.sort((a, b) => {
                    if (a.isCompleted === b.isCompleted) {
                        return a.fileName.localeCompare(b.fileName);
                    }
                    return a.isCompleted ? 1 : -1;
                });

                setTasks(allTasks);

            } catch (e) {
                console.error('Failed to search tasks', e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTasks();
    }, [currentVault]); // Re-run when vault changes or re-mounted

    const handleTaskClick = async (task: Task) => {
        try {
            const note = await loadNote(task.filePath);
            addNote(note);
            setActiveNote(note.id);
            setCurrentView('editor');
        } catch (e) {
            console.error("Failed to open task note", e);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-foreground-muted">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Scanning vault for tasks...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center gap-3 px-8 py-6 border-b border-border">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-orange-500" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
                <div className="ml-auto text-sm text-foreground-muted">
                    {tasks.filter(t => !t.isCompleted).length} open
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
                {tasks.length === 0 ? (
                    <div className="text-center text-foreground-muted mt-20">
                        <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No tasks found.</p>
                        <p className="text-sm opacity-60">Add <code>- [ ] #task</code> to any note to see it here.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Group by File? For now flat list with file badges is cleaner for v1 */}
                        <div className="space-y-2">
                            {tasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => handleTaskClick(task)}
                                    className={cn(
                                        "group flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-background-secondary/30 hover:bg-background-secondary hover:border-border transition-all cursor-pointer",
                                        task.isCompleted && "opacity-60"
                                    )}
                                >
                                    <div className={cn(
                                        "mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors",
                                        task.isCompleted ? "bg-accent border-accent text-accent-foreground" : "border-foreground-muted group-hover:border-accent"
                                    )}>
                                        {task.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-sm font-medium leading-relaxed truncate",
                                            task.isCompleted ? "line-through text-foreground-muted" : "text-foreground"
                                        )}>
                                            {task.content || <span className="italic opacity-50">Empty task</span>}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5 text-xs text-foreground-muted">
                                            <FileText className="w-3 h-3" />
                                            <span className="truncate max-w-[200px]">{task.fileName}</span>
                                            {/* Line number hint */}
                                            <span className="opacity-50">L{task.lineNumber + 1}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
