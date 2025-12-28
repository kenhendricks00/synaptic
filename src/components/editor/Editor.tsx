import { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextAlign from '@tiptap/extension-text-align';
import { useVaultStore, useUIStore, useSettingsStore, usePluginStore } from '../../stores';
import { saveNote, countWords, debounce, markdownToHtml, htmlToMarkdown } from '../../lib';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import { EditorToolbar } from './Toolbar';
import { SelectionMenu } from './SelectionMenu';
import { Link as LinkIcon, FileText } from 'lucide-react';

interface NoteEditorProps {
    className?: string;
}

export function NoteEditor({ className }: NoteEditorProps) {
    const { notes, activeNoteId, updateNote, setActiveNote } = useVaultStore();
    const { hasUnsavedChanges, setHasUnsavedChanges, setWordCount, setCharacterCount, setTypingSpeed, focusMode } = useUIStore();
    const { settings } = useSettingsStore();
    const { installed } = usePluginStore();

    const activeNote = activeNoteId ? notes.get(activeNoteId) : null;

    // typing speed tracking
    const keystrokeTimestamps = useRef<number[]>([]);
    const previousCharCount = useRef<number>(0);
    const lastLocalContentRef = useRef<string | null>(null);

    const calculateTypingSpeed = (currentCharCount: number) => {
        const now = Date.now();
        const charsTyped = Math.max(0, currentCharCount - previousCharCount.current);
        previousCharCount.current = currentCharCount;

        // Add timestamps for each character typed
        for (let i = 0; i < charsTyped; i++) {
            keystrokeTimestamps.current.push(now);
        }

        // Keep only keystrokes from the last 5 seconds
        const fiveSecondsAgo = now - 5000;
        keystrokeTimestamps.current = keystrokeTimestamps.current.filter(t => t > fiveSecondsAgo);

        // Calculate WPM (assuming 5 characters = 1 word)
        const recentKeystrokes = keystrokeTimestamps.current.length;
        const wordsTyped = recentKeystrokes / 5;
        const wpm = Math.round(wordsTyped * 12); // 12 = 60 seconds / 5 second window

        return wpm;
    };

    const backlinkNotes = activeNote?.backlinks?.map(id => notes.get(id)).filter(n => !!n) || [];

    // Debounced save function
    const debouncedSave = useCallback(
        debounce(async (noteId: string, markdownContent: string) => {
            const note = notes.get(noteId);
            if (note) {
                try {
                    await saveNote({ ...note, content: markdownContent });
                    updateNote(noteId, { content: markdownContent });
                    setHasUnsavedChanges(false);
                } catch (error) {
                    console.error('Failed to save note:', error);
                }
            }
        }, settings.autoSaveInterval),
        [notes, settings.autoSaveInterval]
    );

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder: 'Start writing...',
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-accent underline underline-offset-2 hover:text-accent-hover',
                },
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Highlight.configure({
                multicolor: true,
            }),
            Typography,
            BubbleMenu.configure({
                pluginKey: 'bubbleMenu',
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full h-auto my-4',
                },
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'border-collapse table-auto w-full',
                },
            }),
            TableRow,
            TableHeader,
            TableCell,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                alignments: ['left', 'center', 'right', 'justify'],
            }),
        ],
        content: activeNote ? markdownToHtml(activeNote.content) : '',
        editorProps: {
            attributes: {
                class: 'tiptap prose prose-invert max-w-none focus:outline-none',
                spellcheck: settings.spellCheck.toString(),
            },
        },
        onUpdate: ({ editor }) => {
            const htmlContent = editor.getHTML();
            const markdownContent = htmlToMarkdown(htmlContent);
            const text = editor.getText();

            // Store local content to prevent overwrite loop
            lastLocalContentRef.current = markdownContent;

            setWordCount(countWords(text));
            setCharacterCount(text.length);
            setHasUnsavedChanges(true);

            // Calculate typing speed if plugin is enabled
            if (installed.get('typing-speed')?.enabled) {
                const wpm = calculateTypingSpeed(text.length);
                setTypingSpeed(wpm);
            }

            if (activeNoteId && settings.autoSave) {
                debouncedSave(activeNoteId, markdownContent);
            }
        },
    });

    // Update editor content when active note or its content changes
    useEffect(() => {
        if (editor && activeNote) {
            // Always update stats when note changes/loads
            const text = editor.getText();
            setWordCount(countWords(text));
            setCharacterCount(text.length);

            // Skip update if the content matches what we last generated locally
            if (activeNote.content === lastLocalContentRef.current) {
                return;
            }

            // Only update if content is different to avoid cursor jumping
            const htmlContent = markdownToHtml(activeNote.content);
            if (editor.getHTML() !== htmlContent) {
                editor.commands.setContent(htmlContent);
                lastLocalContentRef.current = activeNote.content;
            }
        }
    }, [editor, activeNote?.id, activeNote?.content]);

    // Handle plugin text insertion events
    useEffect(() => {
        if (!editor) return;

        const handleInsertText = (e: CustomEvent<{ text: string }>) => {
            const { text } = e.detail;
            console.log('[Editor] Inserting content:', text.slice(0, 50) + '...');

            // Convert markdown to HTML before inserting
            const html = markdownToHtml(text);
            editor.chain().focus().insertContent(html).run();
        };

        window.addEventListener('synaptic:editor:insert', handleInsertText as EventListener);
        return () => window.removeEventListener('synaptic:editor:insert', handleInsertText as EventListener);
    }, [editor]);

    // Save on unmount or before view change
    useEffect(() => {
        return () => {
            if (editor && activeNoteId && lastLocalContentRef.current) {
                const note = notes.get(activeNoteId);
                if (note && hasUnsavedChanges) {
                    console.log('[Editor] Saving on unmount:', activeNoteId);
                    saveNote({ ...note, content: lastLocalContentRef.current }).catch(console.error);
                }
            }
        };
    }, [editor, activeNoteId, notes, hasUnsavedChanges]);

    if (!activeNote) {
        return (
            <div className={`flex items-center justify-center h-full ${className}`}>
                <div className="text-center">
                    <p className="text-foreground-muted text-lg mb-2">No note selected</p>
                    <p className="text-foreground-muted text-sm">
                        Select a note from the sidebar or create a new one
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Toolbar */}
            {!focusMode && <EditorToolbar editor={editor} />}

            {/* Editor */}
            <div
                className="flex-1 overflow-y-auto p-8"
                style={{
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineHeight,
                    fontFamily: settings.fontFamily,
                }}
            >
                <div className="max-w-3xl mx-auto">
                    {editor && <SelectionMenu editor={editor} />}
                    <EditorContent editor={editor} />

                    {/* Backlinks Section */}
                    {!focusMode && settings.corePlugins['backlinks'] !== false && backlinkNotes.length > 0 && (
                        <div className="mt-16 pt-8 border-t border-border/50">
                            <div className="flex items-center gap-2 mb-4 text-foreground-muted">
                                <LinkIcon className="w-4 h-4" />
                                <h3 className="text-sm font-semibold uppercase tracking-wider">Backlinks</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {backlinkNotes.map((note: any) => (
                                    <button
                                        key={note.id}
                                        onClick={() => setActiveNote(note.id)}
                                        className="flex flex-col gap-1.5 p-4 rounded-xl bg-background-tertiary/50 border border-border/50 hover:border-accent/30 hover:bg-accent/5 transition-all duration-200 text-left group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5 text-accent opacity-70 group-hover:opacity-100 transition-opacity" />
                                            <span className="font-medium text-foreground truncate">{note.title}</span>
                                        </div>
                                        {note.content && (
                                            <p className="text-xs text-foreground-muted line-clamp-2 leading-relaxed italic">
                                                {note.content.replace(/[#*`]/g, '').slice(0, 100)}...
                                            </p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
