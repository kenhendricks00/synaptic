
import { BubbleMenu, type Editor } from '@tiptap/react';
import { MessageSquare, RefreshCw, Volume2 } from 'lucide-react';
import { useAIStore } from '../../stores';
import { kokoroService } from '../../lib/kokoro';

interface SelectionMenuProps {
    editor: Editor;
}

export function SelectionMenu({ editor }: SelectionMenuProps) {
    const { setIsOpen, setInput, voiceId, voiceRate } = useAIStore();

    if (!editor) return null;

    const handleAskAI = () => {
        const selection = editor.state.selection;
        const text = editor.state.doc.textBetween(selection.from, selection.to, '\n');

        if (!text) return;

        setIsOpen(true);
        setInput(`> ${text}\n\n`);
    };

    const handleRewrite = () => {
        const selection = editor.state.selection;
        const text = editor.state.doc.textBetween(selection.from, selection.to, '\n');

        if (!text) return;

        setIsOpen(true);
        setInput(`Rewrite the following text to be more concise. Use the 'replace_text' tool to update the specific section in the note.\n\nText to rewrite:\n${text}`);
    };

    const handleRead = async () => {
        const selection = editor.state.selection;
        const text = editor.state.doc.textBetween(selection.from, selection.to, '\n');

        if (!text) return;

        await kokoroService.speak(text, voiceId, voiceRate);
    };

    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100, placement: 'top' }}
            className="flex items-center gap-1 p-1 rounded-xl bg-background-secondary/80 backdrop-blur-xl border border-border/50 shadow-xl"
        >
            <button
                onClick={handleAskAI}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-background-tertiary text-xs font-medium text-foreground-secondary hover:text-accent transition-colors"
            >
                <MessageSquare className="w-3.5 h-3.5" />
                Ask AI
            </button>
            <div className="w-px h-4 bg-border/50" />
            <button
                onClick={handleRewrite}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-background-tertiary text-xs font-medium text-foreground-secondary hover:text-accent transition-colors"
            >
                <RefreshCw className="w-3.5 h-3.5" />
                Rewrite
            </button>
            <div className="w-px h-4 bg-border/50" />
            <button
                onClick={handleRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-background-tertiary text-xs font-medium text-foreground-secondary hover:text-purple-400 transition-colors"
            >
                <Volume2 className="w-3.5 h-3.5" />
                Read Aloud
            </button>
        </BubbleMenu>
    );
}
